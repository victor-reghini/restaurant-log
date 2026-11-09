import { Plugin } from 'vite';
import pg from 'pg';
import url from 'url';

const { Pool } = pg;

export function localApiPlugin(): Plugin {
  return {
    name: 'local-postgres-api-plugin',
    configureServer(server) {
      const connectionString =
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/restolog';

      const pool = new Pool({ connectionString });

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        const query = parsedUrl.query;

        res.setHeader('Content-Type', 'application/json');

        const sendJson = (status: number, data: unknown) => {
          res.statusCode = status;
          res.end(JSON.stringify(data));
        };

        const readBody = async (): Promise<any> => {
          return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => (body += chunk));
            req.on('end', () => {
              try {
                resolve(body ? JSON.parse(body) : {});
              } catch (e) {
                reject(e);
              }
            });
            req.on('error', reject);
          });
        };

        try {
          // 1. GET /api/restaurants
          if (pathname === '/api/restaurants' && req.method === 'GET') {
            const { category, priceTier, pricingModel, searchQuery, userLat, userLon, maxDistKm } = query;

            if (userLat && userLon) {
              const lat = parseFloat(userLat as string);
              const lon = parseFloat(userLon as string);
              const maxD = maxDistKm ? parseFloat(maxDistKm as string) : 50;

              const sql = `
                WITH nearby AS (
                  SELECT * FROM get_nearby_restaurants($1, $2, $3)
                )
                SELECT n.*, 
                       COALESCE(json_agg(
                         json_build_object(
                           'id', m.id,
                           'name', m.name,
                           'description', m.description,
                           'price', m.price,
                           'dayOfWeek', m.day_of_week,
                           'category', m.category,
                           'isHighlight', m.is_highlight
                         )
                       ) FILTER (WHERE m.id IS NOT NULL), '[]'::json) AS menu_items
                FROM nearby n
                LEFT JOIN menu_items m ON m.restaurant_id = n.id
                WHERE ($4::varchar = 'all' OR n.category = $4::varchar)
                  AND ($5::varchar = 'all' OR n.price_tier = $5::varchar)
                  AND ($6::varchar = 'all' OR n.pricing_model = $6::varchar)
                  AND ($7::varchar = '' OR n.name ILIKE '%' || $7::varchar || '%')
                GROUP BY n.id, n.name, n.description, n.category, n.address, n.latitude, n.longitude,
                         n.price_tier, n.pricing_model, n.pricing_note, n.menu_type, n.opening_hours,
                         n.rating, n.review_count, n.image_url, n.is_verified, n.created_at, n.updated_at, n.dist_km
                ORDER BY n.dist_km ASC;
              `;
              const params = [
                lat,
                lon,
                maxD,
                category || 'all',
                priceTier || 'all',
                pricingModel || 'all',
                searchQuery || '',
              ];
              const result = await pool.query(sql, params);
              const formatted = result.rows.map(mapDbToDomain);
              return sendJson(200, formatted);
            }

            // Normal query without user coordinates
            const sql = `
              SELECT r.*,
                     COALESCE(json_agg(
                       json_build_object(
                         'id', m.id,
                         'name', m.name,
                         'description', m.description,
                         'price', m.price,
                         'dayOfWeek', m.day_of_week,
                         'category', m.category,
                         'isHighlight', m.is_highlight
                       )
                     ) FILTER (WHERE m.id IS NOT NULL), '[]'::json) AS menu_items
              FROM restaurants r
              LEFT JOIN menu_items m ON m.restaurant_id = r.id
              WHERE r.is_verified = true
                AND ($1::varchar = 'all' OR r.category = $1::varchar)
                AND ($2::varchar = 'all' OR r.price_tier = $2::varchar)
                AND ($3::varchar = 'all' OR r.pricing_model = $3::varchar)
                AND ($4::varchar = '' OR r.name ILIKE '%' || $4::varchar || '%')
              GROUP BY r.id
              ORDER BY r.rating DESC;
            `;
            const params = [
              category || 'all',
              priceTier || 'all',
              pricingModel || 'all',
              searchQuery || '',
            ];
            const result = await pool.query(sql, params);
            const formatted = result.rows.map(mapDbToDomain);
            return sendJson(200, formatted);
          }

          // 2. GET /api/restaurants/:id
          if (pathname?.startsWith('/api/restaurants/') && req.method === 'GET') {
            const id = pathname.replace('/api/restaurants/', '');
            const sql = `
              SELECT r.*,
                     COALESCE(json_agg(
                       json_build_object(
                         'id', m.id,
                         'name', m.name,
                         'description', m.description,
                         'price', m.price,
                         'dayOfWeek', m.day_of_week,
                         'category', m.category,
                         'isHighlight', m.is_highlight
                       )
                     ) FILTER (WHERE m.id IS NOT NULL), '[]'::json) AS menu_items
              FROM restaurants r
              LEFT JOIN menu_items m ON m.restaurant_id = r.id
              WHERE r.id = $1::uuid
              GROUP BY r.id;
            `;
            const result = await pool.query(sql, [id]);
            if (result.rows.length === 0) {
              return sendJson(404, { error: 'Restaurant not found' });
            }
            return sendJson(200, mapDbToDomain(result.rows[0]));
          }

          // 3. GET /api/reviews
          if (pathname === '/api/reviews' && req.method === 'GET') {
            const restaurantId = query.restaurantId as string;
            const sql = `SELECT * FROM reviews WHERE restaurant_id = $1::uuid ORDER BY created_at DESC;`;
            const result = await pool.query(sql, [restaurantId]);
            const reviews = result.rows.map(r => ({
              id: r.id,
              restaurantId: r.restaurant_id,
              userId: r.user_id,
              userName: r.user_name,
              userAvatar: r.user_avatar,
              rating: r.rating,
              comment: r.comment,
              photoUrls: r.photo_urls || [],
              createdAt: r.created_at,
            }));
            return sendJson(200, reviews);
          }

          // 4. POST /api/reviews
          if (pathname === '/api/reviews' && req.method === 'POST') {
            const b = await readBody();
            const sql = `
              INSERT INTO reviews (restaurant_id, user_id, user_name, user_avatar, rating, comment, photo_urls)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING *;
            `;
            const result = await pool.query(sql, [
              b.restaurantId,
              b.userId || 'guest-user',
              b.userName || 'Convidado',
              b.userAvatar || null,
              b.rating,
              b.comment,
              b.photoUrls || [],
            ]);
            const r = result.rows[0];
            return sendJson(201, {
              id: r.id,
              restaurantId: r.restaurant_id,
              userId: r.user_id,
              userName: r.user_name,
              userAvatar: r.user_avatar,
              rating: r.rating,
              comment: r.comment,
              photoUrls: r.photo_urls || [],
              createdAt: r.created_at,
            });
          }

          // 5. GET /api/favorites
          if (pathname === '/api/favorites' && req.method === 'GET') {
            const userId = (query.userId as string) || 'default-local-user';
            const sql = `SELECT restaurant_id FROM favorites WHERE user_id = $1;`;
            const result = await pool.query(sql, [userId]);
            return sendJson(200, result.rows.map(row => row.restaurant_id));
          }

          // 6. POST /api/favorites
          if (pathname === '/api/favorites' && req.method === 'POST') {
            const { restaurantId, isFavorite, userId } = await readBody();
            const uId = userId || 'default-local-user';
            if (isFavorite) {
              await pool.query(
                `INSERT INTO favorites (user_id, restaurant_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
                [uId, restaurantId]
              );
            } else {
              await pool.query(
                `DELETE FROM favorites WHERE user_id = $1 AND restaurant_id = $2;`,
                [uId, restaurantId]
              );
            }
            return sendJson(200, { success: true });
          }

          // 7. GET /api/duplicates
          if (pathname === '/api/duplicates' && req.method === 'GET') {
            const { name, lat, lon } = query;
            const sql = `SELECT * FROM find_duplicate_restaurants($1, $2, $3);`;
            const result = await pool.query(sql, [
              name as string,
              lat ? parseFloat(lat as string) : null,
              lon ? parseFloat(lon as string) : null,
            ]);
            return sendJson(200, result.rows.map(mapDbToDomain));
          }

          // 8. POST /api/suggestions
          if (pathname === '/api/suggestions' && req.method === 'POST') {
            const b = await readBody();
            const sql = `
              INSERT INTO restaurant_suggestions (type, target_restaurant_id, data, suggested_by_user_id, suggested_by_user_name, status)
              VALUES ($1, $2, $3, $4, $5, 'pending')
              RETURNING *;
            `;
            const result = await pool.query(sql, [
              b.type,
              b.targetRestaurantId || null,
              b.data,
              b.suggestedBy?.userId || 'local-user',
              b.suggestedBy?.userName || 'Colaborador Local',
            ]);
            const s = result.rows[0];
            return sendJson(201, {
              id: s.id,
              type: s.type,
              targetRestaurantId: s.target_restaurant_id,
              data: s.data,
              suggestedBy: {
                userId: s.suggested_by_user_id,
                userName: s.suggested_by_user_name,
              },
              status: s.status,
              createdAt: s.created_at,
            });
          }

          sendJson(404, { error: 'Not Found' });
        } catch (err: any) {
          console.error('[Local API Error]:', err);
          sendJson(500, { error: err.message });
        }
      });
    },
  };
}

function mapDbToDomain(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.category,
    address: row.address,
    coordinates: {
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
    },
    priceTier: row.price_tier,
    pricingModel: row.pricing_model,
    pricingNote: row.pricing_note,
    menuType: row.menu_type,
    menuItems: (row.menu_items || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      price: m.price ? parseFloat(m.price) : undefined,
      dayOfWeek: m.dayOfWeek || m.day_of_week,
      category: m.category,
      isHighlight: m.isHighlight || m.is_highlight,
    })),
    openingHours: row.opening_hours || '',
    rating: parseFloat(row.rating || 0),
    reviewCount: parseInt(row.review_count || 0, 10),
    imageUrl: row.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    distanceKm: row.dist_km ? Number(parseFloat(row.dist_km).toFixed(1)) : undefined,
    isVerified: row.is_verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

