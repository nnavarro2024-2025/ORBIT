export const getEquipmentStatusColor = (status: string) => {
  const normalized = status.toLowerCase().replace(/_/g, ' ');
  if (normalized === 'prepared' || normalized === 'available') return 'bg-green-100 text-green-800';
  if (normalized === 'not available') return 'bg-red-100 text-red-800';
  if (normalized === 'requested' || normalized === 'pending') return 'bg-yellow-100 text-yellow-800';
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
        
        // Handle new format with items array
        if (equipmentData?.items && Array.isArray(equipmentData.items)) {
          const equipmentObj: Record<string, string> = {};
          equipmentData.items.forEach((item: any) => {
            if (typeof item === 'string') {
              equipmentObj[item.replace(/\\s+/g, '_').toLowerCase()] = 'requested';
            } else if (item?.name) {
              equipmentObj[item.name.replace(/\\s+/g, '_').toLowerCase()] = item.status || 'requested';
            }
          });
          if (equipmentData.others) {
            equipmentObj['others'] = equipmentData.others;
          }
          return { baseMessage, equipment: equipmentObj };
        }
        
        // Handle legacy format
        return { baseMessage, equipment: equipmentData || {} };
      }
      return { baseMessage, equipment: null };
    } catch {
      const baseMessage = message.substring(0, equipmentMarker).trim();
      return { baseMessage, equipment: null };
    }
  }
  return { baseMessage: message, equipment: null };
};
