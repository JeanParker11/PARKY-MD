function getDevice(messageId) {
  const device = messageId.length > 21
    ? messageId.substring(0, 2)
    : messageId.charAt(0);
  const devices = {
    '3A': 'Android',
    '3B': 'iOS',
    '3C': 'Web',
    'BA': 'Business Android',
    'IA': 'iOS App',
    'WA': 'Web App',
    'FA': 'Facebook Portal',
    '': 'Inconnu'
  };
  return devices[device] || 'Non identifié';
}

module.exports = {
  getDevice
}