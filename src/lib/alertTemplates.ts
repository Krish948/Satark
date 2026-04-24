export interface AlertTemplate {
  id: string;
  name: string;
  alertType: string;
  message: string;
  region?: string;
}

export const ALERT_TEMPLATES: AlertTemplate[] = [
  {
    id: "flood-warning",
    name: "Flood warning",
    alertType: "Flood",
    message: "Heavy rainfall expected. Move to higher ground and avoid crossing waterlogged roads.",
    region: "Riverside Zone",
  },
  {
    id: "fire-evacuation",
    name: "Fire evacuation",
    alertType: "Fire",
    message: "Fire reported in the area. Evacuate calmly through designated exits and avoid elevators.",
    region: "Industrial Zone",
  },
  {
    id: "cyclone-prep",
    name: "Cyclone preparedness",
    alertType: "Cyclone",
    message: "Cyclone alert issued. Secure loose objects, charge devices, and follow official updates.",
    region: "Coastal Zone",
  },
  {
    id: "heatwave-advisory",
    name: "Heatwave advisory",
    alertType: "Heatwave",
    message: "Extreme heat expected. Stay hydrated, avoid direct sun, and check on elderly residents.",
    region: "Urban Core",
  },
];
