import type { PropertyFormValues } from './constants';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePropertyForm(formData: PropertyFormValues): ValidationResult {
  const errors: string[] = [];

  if (!formData.title.trim()) errors.push('Title');
  if (!formData.price.trim()) errors.push('Price');
  if (!formData.address.trim()) errors.push('Address');

  if (errors.length) {
    return { valid: false, errors: [`Please fill required fields: ${errors.join(', ')}`] };
  }

  const price = parseFloat(formData.price);
  if (price <= 0) errors.push('Price must be greater than 0');

  const area = formData.area ? parseFloat(formData.area) : null;
  const sq_living = formData.sq_living ? parseFloat(formData.sq_living) : null;
  const sq_kitchen = formData.sq_kitchen ? parseFloat(formData.sq_kitchen) : null;
  if (area != null && sq_living != null && sq_kitchen != null && area < sq_living + sq_kitchen) {
    errors.push('Total area must be at least living area + kitchen area');
  }

  const rooms = formData.rooms ? parseInt(formData.rooms) : null;
  if (rooms != null && rooms <= 0) errors.push('Number of rooms must be greater than 0');

  const floor = formData.floor ? parseInt(formData.floor) : null;
  const total_floors = formData.total_floors ? parseInt(formData.total_floors) : null;
  if (floor != null && total_floors != null && floor > total_floors) {
    errors.push('Floor cannot exceed total floors');
  }

  const build_year = formData.build_year ? parseInt(formData.build_year) : null;
  if (build_year != null && (build_year < 1900 || build_year > new Date().getFullYear() + 1)) {
    errors.push('Build year seems incorrect');
  }

  return { valid: errors.length === 0, errors };
}
