# План изменений формы добавления объекта

## 1. geocoder.service.ts
- Добавить `lang: 'en_US'` в URLSearchParams
- Расширить `GeocoderResult`: `district: string | null`, `metro: string | null`
- Парсить `Components` из ответа: искать `kind === 'district'` и `kind === 'metro'`

## 2. AddPropertyPage.tsx
- Step 2: добавить ImageUploader (gridColumn 1/-1), Living Area, Kitchen Area после Parking
- Step 3: убрать ImageUploader, Living Area, Kitchen Area
- `selectAddressSuggestion`: автозаполнять district/metro из результата
- Загружать `propertyService.getMeta()` → metro list → `<datalist id="metro-list">`
- Debounce 300ms в `handleAddressChange`

## 3. PropertyFormModal.tsx
- Аналогичные изменения

## 4. AddPropertyPage.test.tsx
- "renders location fields on step 3" — убрать проверку image-uploader
- "renders all step 2 detail fields" — добавить ImageUploader, Living Area, Kitchen Area
- "handles image upload via ImageUploader onChange" — кликать на шаге 2
- "fills all fields and submits successfully" — sq_living/sq_kitchen/images на шаг 2

## 5. PropertyFormModal.test.tsx
- "pre-fills images on step 3" → "pre-fills images on step 2"
- "renders all step 3 fields" — убрать images/living/kitchen
- "renders all step 2 fields with defaults" — добавить ImageUploader, Living Area, Kitchen Area
- "includes optional fields when provided" — district/images на шаг 2
