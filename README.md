# Веб-версия «Авалон · Помощник пациента»

**Опубликовано:** https://varta2005.github.io (репозиторий VARTA2005/varta2005.github.io, ветка `main`).
Чтобы обновить сайт — скопируйте содержимое `web/` (без `tools/`) в этот репозиторий и отправьте в `main`.
Старый адрес varta2005.github.io/AVALON/ переадресует сюда (с сохранением ссылки на нужную памятку).

Статический сайт (PWA): открывается по ссылке на любом устройстве, работает офлайн, ставится на главный экран.

Контент и иллюстрации экспортируются из Android-приложения (единый источник):

```
./gradlew :app:testDebugUnitTest --tests '*WebExport*'   # data.json, qr.svg, кадры анимаций
python3 web/tools/build_art.py                           # анимированные WebP в web/art
cp apk/Avalon-Patient-*.apk web/apk/Avalon-Patient.apk   # APK для скачивания с сайта
```

Адрес сайта задаётся в `Clinic.WebUrl` (`app/src/main/java/.../data/AppState.kt`) — по нему строятся все QR-коды.
Прямые ссылки: `#/guide/implant`, `#/guide/extraction/2` (вкладка «Нельзя»), `#/doctor/rybalchenko`, `#/promo/all4` и т.д.
