# nestAI — Frontend

Фронтенд рекомендательной системы для недвижимости на React + TypeScript + Vite.

## Технологии

| Компонент | Версия |
|---|---|
| React | 19 |
| TypeScript | 6 |
| Vite | 8 |
| Redux Toolkit | 2.11 |
| React Router DOM | 7 |
| Axios | 1.16 |
| Yandex Maps API | 3 |
| SCSS/Sass | 1.99 |
| Vitest + Testing Library | последняя |

## Архитектура

Проект следует **Feature-Sliced Design (FSD)**:

```
src/
├── app/        # Инициализация, store, routing, глобальные стили
├── pages/      # Страницы (Home, Map, Catalog, Login, Profile...)
├── features/   # Фичи (propertyForm, uploadImages)
├── entities/   # Сущности (property, user)
├── widgets/    # Компоненты (FilterPanel, PropertyCard)
└── shared/     # Инфраструктура: API-клиент, UI-kit, утилиты, типы
```

## Быстрый старт

```bash
cd frontend
npm install
npm run dev       # dev-сервер на http://localhost:5173
npm run build     # production сборка в dist/
npm run preview   # просмотр production сборки
```

## Тестирование

```bash
npm test -- --run              # однократный прогон
npm test                        # watch режим
npx vitest --coverage            # с coverage (порог: 90% lines)
npm run lint                     # ESLint
npx tsc --noEmit                 # TypeScript проверка
```

## Переменные окружения

| Переменная | Обязательная | По умолчанию |
|---|---|---|
| `VITE_API_URL` | ❌ | `http://localhost:8000` |
| `VITE_YANDEX_MAPS_API_KEY` | ✅ | — |
| `VITE_YANDEX_GEOCODER_API_KEY` | ✅ | — |

Документация проекта: [README](../README.md), [Архитектура](../ARCHITECTURE.md).
