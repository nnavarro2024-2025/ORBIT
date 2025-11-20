export const getEquipmentStatusColor = (status: string) => {
  const normalized = status.toLowerCase().replace(/_/g, ' ');
  if (normalized === 'prepared' || normalized === 'available') return 'bg-green-100 text-green-800';
  if (normalized === 'not available') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
};

export const parseEquipmentFromAlertMessage = (message: string) => {
  const equipmentMarker = message.indexOf('[Equipment:');
  if (equipmentMarker !== -1) {
    try {
      const baseMessage = message.substring(0, equipmentMarker).trim();
      const jsonStart = message.indexOf('{', equipmentMarker);
      if (jsonStart === -1) return { baseMessage, equipment: null };
      let depth = 0;
      let jsonEnd = -1;
      for (let i = jsonStart; i < message.length; i++) {
        if (message[i] === '{') depth++;
        if (message[i] === '}') { depth--; if (depth === 0) { jsonEnd = i + 1; break; } }
      }
      if (jsonEnd !== -1) {
        const jsonStr = message.substring(jsonStart, jsonEnd);
        const equipmentData = JSON.parse(jsonStr);
        return { baseMessage, equipment: equipmentData.items || equipmentData || {} };
      }
      return { baseMessage, equipment: null };
    } catch {
      const baseMessage = message.substring(0, equipmentMarker).trim();
      return { baseMessage, equipment: null };
    }
  }
  return { baseMessage: message, equipment: null };
};
