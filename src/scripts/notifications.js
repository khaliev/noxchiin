// ============================================================================
// notifications.js — Push-уведомления (Notification API + Service Worker).
// ============================================================================
// Политика: НИКОГДА не запрашиваем разрешение автоматически при загрузке.
// Разрешение запрашивается ТОЛЬКО по явной кнопке (в «Родительском уголке»).
//
// Без сервера нельзя слать фоновые push по расписанию — это честное ограничение
// клиентского PWA. Здесь реализованы: запрос разрешения и локальное уведомление
// (например, напоминание-«тест»). Для расписания можно позже подключить
// Notification Triggers API там, где он поддерживается.
// ============================================================================

/** Поддерживает ли браузер уведомления + Service Worker. */
export function isSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/** Текущее разрешение: 'default' | 'granted' | 'denied'. */
export function permission() {
  return isSupported() ? Notification.permission : 'denied';
}

/**
 * Запрашивает разрешение на уведомления (вызывать только по действию пользователя).
 * @returns {Promise<'granted' | 'denied' | 'default'>}
 */
export async function requestPermission() {
  if (!isSupported()) return 'denied';
  return Notification.requestPermission();
}

/**
 * Показывает уведомление через Service Worker.
 * @param {string} title — заголовок.
 * @param {object} [options] — параметры Notification.
 * @returns {Promise<boolean>} true, если уведомление отправлено.
 */
export async function notify(title, options = {}) {
  if (!isSupported() || Notification.permission !== 'granted') return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      ...options,
    });
    return true;
  } catch {
    return false;
  }
}

/** Тестовое уведомление (проверка после включения разрешения). */
export function sendTestNotification() {
  return notify('Нохчийн Мотт 🐺', {
    body: 'Уведомления работают! Теперь ты не забудешь про урок.',
    tag: 'noxchiin-test',
  });
}
