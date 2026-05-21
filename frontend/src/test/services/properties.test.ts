import { describe, it, expect, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from '@shared/api/api';
import { propertyService } from '@shared/api/properties.service';

const mock = new MockAdapter(api);

describe('propertyService', () => {
  beforeEach(() => {
    mock.reset();
  });

  it('should fetch properties with params', async () => {
    mock.onGet('/api/properties').reply(200, [{ id: '1', title: 'Test' }]);
    const result = await propertyService.getProperties({ limit: 10 });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Test');
  });

  it('should fetch property by id', async () => {
    mock.onGet('/api/properties/1').reply(200, { id: '1', title: 'Detail' });
    const result = await propertyService.getPropertyById('1');
    expect(result.title).toBe('Detail');
  });

  it('should create property', async () => {
    mock.onPost('/api/properties/').reply(201, { id: '1', title: 'New', price: 100000 });
    const result = await propertyService.createProperty({ title: 'New', price: 100000 });
    expect(result.id).toBe('1');
  });

  it('should update property', async () => {
    mock.onPut('/api/properties/1').reply(200, { id: '1', title: 'Updated' });
    const result = await propertyService.updateProperty('1', { title: 'Updated' });
    expect(result.title).toBe('Updated');
  });

  it('should delete property', async () => {
    mock.onDelete('/api/properties/1').reply(204);
    await expect(propertyService.deleteProperty('1')).resolves.toBeUndefined();
  });

  it('should get my properties', async () => {
    mock.onGet('/api/properties/my').reply(200, [{ id: '1' }]);
    const result = await propertyService.getMyProperties();
    expect(result).toHaveLength(1);
  });

  it('should get meta', async () => {
    const meta = { districts: ['Center'], metro: ['Station'], materials: ['brick'], repair_types: ['euro'], property_types: ['Apartment'], cities: ['Moscow'] };
    mock.onGet('/api/properties/meta').reply(200, meta);
    const result = await propertyService.getMeta();
    expect(result.cities).toContain('Moscow');
  });

  it('should upload images', async () => {
    mock.onPost('/api/upload/').reply(200, { urls: ['img1.jpg', 'img2.jpg'] });
    const files = [new File([''], 'test.jpg', { type: 'image/jpeg' })];
    const result = await propertyService.uploadImages(files);
    expect(result).toHaveLength(2);
  });

  it('should get properties in box', async () => {
    mock.onGet('/api/properties/map').reply(200, [{ id: '1' }]);
    const bounds: [number, number, number, number] = [56.0, 38.0, 55.0, 36.0];
    const result = await propertyService.getPropertiesInBox(bounds);
    expect(result).toHaveLength(1);
  });

  it('should handle errors on create', async () => {
    mock.onPost('/api/properties/').reply(400, { detail: 'Bad request' });
    await expect(propertyService.createProperty({})).rejects.toThrow();
  });

  it('should handle errors on get by id', async () => {
    mock.onGet('/api/properties/999').reply(404);
    await expect(propertyService.getPropertyById('999')).rejects.toThrow();
  });
});
