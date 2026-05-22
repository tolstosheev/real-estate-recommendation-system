# Context Log

## 2026-05-22 — CSS fixes: card equal heights & badges gap

### Commit `fd489fd`
- **PropertyCard.scss**: `margin-top: auto` on CTA button — прибивает кнопку к низу карточки
- **Home.scss**: `.swiper-slide { height: auto !important; display: flex; align-items: stretch }` + `.recommendations-slide { flex: 1 }` — все слайды Swiper одинаковой высоты (тянутся к самому высокому). Удалён дублирующий `.recommendations-slider { height: auto }`.
- **PropertyDetails.tsx**: badges обёрнуты в `.content-badges` (flex-контейнер с `gap: 8px`)
- **PropertyDetails.scss**: новый `.content-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px }`

### Не фиксилось (known issues)
- Purpose filter: при нехватке объектов в БД fallback возвращает все purpose, weights обнулены — sale/daily_rent не штрафуются в скоринге. Фикс отложен, пока мало объектов в БД.
- FEATURE_WEIGHTS: daily_rent = 0.5 vs sale/rent = 1.5. Оставлено как есть (пользователь устраивает).

## 2026-05-23 — City auto-fill from geocoder province

### Commit (next)
- **geocoder.service.ts**: добавлен `city: string | null` в `GeocoderResult`. Извлекается из последнего `province` компонента адреса — берётся первое слово ("Tula Region" → "Tula").
- **constants.ts**: добавлено `city: string` в `PropertyFormValues` и `EMPTY_FORM`.
- **AddPropertyPage.tsx**: `city` в formData → устанавливается при выборе подсказки геокодера → передаётся в API.
- **PropertyFormModal.tsx**: то же для редактирования — `city` загружается из `property.city`, устанавливается при выборе адреса, передаётся в API (create/update).
