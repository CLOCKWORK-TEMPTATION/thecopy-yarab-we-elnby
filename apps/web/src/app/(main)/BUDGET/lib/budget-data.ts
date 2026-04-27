import { Budget } from "./types";
import { createLineItem, createCategory, createSection } from "./budget-helpers";

// Above The Line Section
const aboveTheLineSection = createSection(
  "atl",
  "Above The Line",
  [
    createCategory("10-00", "Development Costs", [
      createLineItem("10-01", "Prelim Breakdown"),
      createLineItem("10-02", "Office Expenses"),
      createLineItem("10-03", "Survey/Scouting"),
      createLineItem("10-04", "Travel Expenses"),
      createLineItem("10-05", "Legal"),
      createLineItem("10-06", "All in"),
    ]),
    createCategory("11-00", "Story & Rights", [
      createLineItem("11-01", "Writers"),
      createLineItem("11-02", "Script Purchase"),
      createLineItem("11-03", "Script Copies"),
      createLineItem("11-04", "Script Timing"),
      createLineItem("11-05", "Script Clearance Report"),
    ]),
    createCategory("12-00", "Producers Unit", [
      createLineItem("12-01", "Producer"),
      createLineItem("12-02", "Co-Producer"),
      createLineItem("12-03", "Asst to Producers"),
      createLineItem("12-04", "Producers Entertainment"),
      createLineItem("12-05", "All In"),
    ]),
    createCategory("13-00", "Director & Staff", [
      createLineItem("13-01", "Director"),
      createLineItem("13-02", "Asst to Director"),
      createLineItem("13-03", "Director Entertainment"),
      createLineItem("13-04", "Storyboard Artist"),
      createLineItem("13-05", "Choreographer"),
      createLineItem("13-06", "Technical Advisor"),
    ]),
    createCategory("14-00", "Cast", [
      createLineItem("14-01", "Lead Cast"),
      createLineItem("14-02", "Supporting Cast"),
      createLineItem("14-03", "Day Players"),
      createLineItem("14-04", "Stunt Coordinators"),
      createLineItem("14-05", "Stunts & Adjustments"),
      createLineItem("14-06", "Stunt Equipment"),
      createLineItem("14-07", "Casting Director"),
      createLineItem("14-08", "Casting Asst"),
      createLineItem("14-09", "Casting Expenses"),
      createLineItem("14-10", "Rehearsal Expenses"),
      createLineItem("14-11", "Looping / ADR"),
      createLineItem("14-12", "Mileage"),
      createLineItem("14-13", "Cast Drivers"),
      createLineItem("14-14", "Cast Payroll Handling Fees"),
    ]),
    createCategory("15-00", "Travel & Living", [
      createLineItem("15-01", "Airfares"),
      createLineItem("15-02", "Transportation"),
      createLineItem("15-03", "Hotel / Lodging"),
      createLineItem("15-04", "Per Diem"),
      createLineItem("15-05", "Self Drive Vehicles & Gas"),
    ]),
  ],
  "#3B82F6"
);

// Production Section
const productionSection = createSection(
  "production",
  "Production Expenses",
  [
    createCategory("20-00", "Production Staff", [
      createLineItem("20-01", "Line Producer"),
      createLineItem("20-02", "Production Manager"),
      createLineItem("20-03", "1st Assistant Director"),
      createLineItem("20-04", "2nd Assistant Director"),
      createLineItem("20-05", "2nd 2nd Assistant Director"),
      createLineItem("20-06", "Script Supervisor"),
      createLineItem("20-07", "Production Coordinator"),
      createLineItem("20-08", "Asst Prod Coordinator"),
      createLineItem("20-09", "Production Secretary"),
      createLineItem("20-10", "Production Assistants"),
      createLineItem("20-11", "Production Accountant"),
      createLineItem("20-12", "1st Asst Accountant"),
      createLineItem("20-13", "Payroll Accountant"),
      createLineItem("20-14", "Box Rentals"),
    ]),
    createCategory("21-00", "Extra Talent", [
      createLineItem("21-01", "Stand-ins"),
      createLineItem("21-02", "Union Extras"),
      createLineItem("21-03", "Non-Union Extras"),
      createLineItem("21-04", "Dancers"),
      createLineItem("21-05", "Extras Coordinator"),
      createLineItem("21-06", "Fitting / MPV / Wardrobe Allow"),
      createLineItem("21-07", "Mileage"),
    ]),
    createCategory("22-00", "Set Design", [
      createLineItem("22-01", "Production Designer"),
      createLineItem("22-02", "Art Director"),
      createLineItem("22-03", "Research"),
      createLineItem("22-04", "Expendables"),
      createLineItem("22-05", "Signage"),
      createLineItem("22-06", "Blueprints"),
      createLineItem("22-07", "Box Rentals"),
    ]),
    createCategory("23-00", "Set Construction", [
      createLineItem("23-01", "Construction Coordinator"),
      createLineItem("23-02", "Construction Foreman"),
      createLineItem("23-03", "Carpenters"),
      createLineItem("23-04", "Sculptors"),
      createLineItem("23-05", "Painters"),
      createLineItem("23-06", "Stagehands"),
      createLineItem("23-07", "Materials"),
      createLineItem("23-08", "Rental"),
    ]),
    createCategory("24-00", "Set Dressing", [
      createLineItem("24-01", "Set Decorator"),
      createLineItem("24-02", "Asst Set Decorator"),
      createLineItem("24-03", "Leadman"),
      createLineItem("24-04", "Set Dressers"),
      createLineItem("24-05", "Swing Gang"),
      createLineItem("24-06", "Set Dressing Labour"),
      createLineItem("24-07", "Set Rental"),
      createLineItem("24-08", "Set Props"),
    ]),
    createCategory("25-00", "Property", [
      createLineItem("25-01", "Prop Master"),
      createLineItem("25-02", "Asst Prop Master"),
      createLineItem("25-03", "Props"),
      createLineItem("25-04", "Picture Props"),
      createLineItem("25-05", "Props Labour"),
      createLineItem("25-06", "Props Rental"),
    ]),
  ],
  "#10B981"
);

// Camera & Electrical Section
const cameraSection = createSection(
  "camera",
  "Camera & Electrical",
  [
    createCategory("30-00", "Camera Department", [
      createLineItem("30-01", "Director of Photography"),
      createLineItem("30-02", "Camera Operator"),
      createLineItem("30-03", "1st Asst Camera"),
      createLineItem("30-04", "2nd Asst Camera"),
      createLineItem("30-05", "Digital Image Technician"),
      createLineItem("30-06", "Camera Loader"),
      createLineItem("30-07", "Steadicam Operator"),
      createLineItem("30-08", "Camera Rental"),
      createLineItem("30-09", "Lenses"),
      createLineItem("30-10", "Video Assist"),
    ]),
    createCategory("31-00", "Electrical Department", [
      createLineItem("31-01", "Gaffer"),
      createLineItem("31-02", "Best Boy Electric"),
      createLineItem("31-03", "Electricians"),
      createLineItem("31-04", "Generator Operator"),
      createLineItem("31-05", "Electrical Rental"),
      createLineItem("31-06", "Electrical Consumables"),
    ]),
    createCategory("32-00", "Grip Department", [
      createLineItem("32-01", "Key Grip"),
      createLineItem("32-02", "Best Boy Grip"),
      createLineItem("32-03", "Dolly Grip"),
      createLineItem("32-04", "Company Grips"),
      createLineItem("32-05", "Grip Rental"),
      createLineItem("32-06", "Special Equipment"),
    ]),
  ],
  "#F59E0B"
);

// Post Production Section
const postSection = createSection(
  "post",
  "Post Production",
  [
    createCategory("50-00", "Editorial", [
      createLineItem("50-01", "Editor"),
      createLineItem("50-02", "Asst Editor"),
      createLineItem("50-03", "Colorist"),
      createLineItem("50-04", "Online Editor"),
      createLineItem("50-05", "Finishing"),
    ]),
    createCategory("51-00", "Sound", [
      createLineItem("51-01", "Sound Designer"),
      createLineItem("51-02", "Dialogue Editor"),
      createLineItem("51-03", "Foley"),
      createLineItem("51-04", "Music Composer"),
      createLineItem("51-05", "Music Licensing"),
    ]),
    createCategory("52-00", "VFX", [
      createLineItem("52-01", "VFX Supervisor"),
      createLineItem("52-02", "CG Artists"),
      createLineItem("52-03", "Compositors"),
      createLineItem("52-04", "VFX Render"),
    ]),
  ],
  "#8B5CF6"
);

// Enhanced budget template
export const INITIAL_BUDGET_TEMPLATE: Budget = {
  currency: "USD",
  grandTotal: 0,
  metadata: {
    title: "",
    director: "",
    producer: "",
    productionCompany: "",
    shootingDays: 0,
    locations: [],
    genre: "",
  },
  sections: [aboveTheLineSection, productionSection, cameraSection, postSection],
};

// Additional constants
export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "AED", "SAR"] as const;

export const UNITS = ["Flat", "Day", "Week", "Month", "Hour", "Page", "Shot", "Unit"] as const;
