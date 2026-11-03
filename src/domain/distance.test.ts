import { describe, it, expect } from 'vitest';
import { calculateHaversineDistanceKm, MockRestaurantRepository } from '../infrastructure/mock/MockRestaurantRepository';
import { Coordinates } from './entities/Restaurant';

describe('Domain & Infrastructure Tests', () => {
  it('calculates geographic distance accurately using Haversine formula', () => {
    // Av. Paulista (Masp) to Consolação (Metro) ~ 1.0 km
    const masp: Coordinates = { latitude: -23.5615, longitude: -46.6559 };
    const consolacao: Coordinates = { latitude: -23.5539, longitude: -46.6558 };

    const distance = calculateHaversineDistanceKm(masp, consolacao);
    expect(distance).toBeGreaterThan(0.7);
    expect(distance).toBeLessThan(1.2);
  });

  it('detects duplicate restaurants by similar name', async () => {
    const repo = new MockRestaurantRepository();
    // In mock data: "Sabor Caseiro & Cia"
    const duplicates = await repo.findDuplicates('Sabor Caseiro');
    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0].name).toContain('Sabor Caseiro');
  });

  it('filters restaurants by priceTier and category', async () => {
    const repo = new MockRestaurantRepository();
    const pizzaList = await repo.getRestaurants({ category: 'pizza' });
    expect(pizzaList.length).toBeGreaterThan(0);
    expect(pizzaList.every((r) => r.category === 'pizza')).toBe(true);

    const cheapList = await repo.getRestaurants({ priceTier: '$' });
    expect(cheapList.length).toBeGreaterThan(0);
    expect(cheapList.every((r) => r.priceTier === '$')).toBe(true);
  });
});

