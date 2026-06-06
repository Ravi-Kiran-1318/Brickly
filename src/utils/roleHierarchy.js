export const ROLE_HIERARCHY = {
  'Plumber': [
    'Plumbing Helper',
    'Junior Plumber',
    'Plumber',
    'Senior Plumber',
    'Plumbing Supervisor',
    'Plumbing Foreman'
  ],
  'Electrician': [
    'Electrical Helper',
    'Junior Electrician',
    'Electrician',
    'Senior Electrician',
    'Electrical Supervisor',
    'Electrical Foreman'
  ],
  'Mason': [
    'Mason Helper',
    'Junior Mason',
    'Mason',
    'Senior Mason',
    'Masonry Supervisor',
    'Masonry Foreman'
  ],
  'Carpenter': [
    'Carpentry Helper',
    'Junior Carpenter',
    'Carpenter',
    'Senior Carpenter',
    'Carpentry Supervisor',
    'Carpentry Foreman'
  ],
  'Welder': [
    'Welding Helper',
    'Junior Welder',
    'Welder',
    'Senior Welder',
    'Welding Supervisor',
    'Welding Foreman'
  ],
  'Painter': [
    'Painting Helper',
    'Junior Painter',
    'Painter',
    'Senior Painter',
    'Painting Supervisor',
    'Painting Foreman'
  ],
  'Tiler': [
    'Tiling Helper',
    'Junior Tiler',
    'Tiler',
    'Senior Tiler',
    'Tiling Supervisor',
    'Tiling Foreman'
  ],
  'Roofer': [
    'Roofing Helper',
    'Junior Roofer',
    'Roofer',
    'Senior Roofer',
    'Roofing Supervisor',
    'Roofing Foreman'
  ],
  'AC Technician': [
    'AC Helper',
    'Junior AC Technician',
    'AC Technician',
    'Senior AC Technician',
    'HVAC Supervisor',
    'HVAC Foreman'
  ],
  'Civil Engineer': [
    'Junior Civil Engineer',
    'Civil Engineer',
    'Senior Civil Engineer',
    'Civil Engineering Lead',
    'Civil Engineering Manager'
  ],
  'Architect': [
    'Junior Architect',
    'Architect',
    'Senior Architect',
    'Principal Architect',
    'Lead Architect'
  ],
  'Interior Designer': [
    'Junior Interior Designer',
    'Interior Designer',
    'Senior Interior Designer',
    'Lead Interior Designer',
    'Principal Interior Designer'
  ],
  'Foreman': [
    'Assistant Foreman',
    'Foreman',
    'Senior Foreman',
    'General Foreman',
    'Site Supervisor'
  ]
};

export const getTradeForRole = (jobRole) => {
  for (const [trade, roles] of Object.entries(ROLE_HIERARCHY)) {
    if (roles.includes(jobRole)) {
      return trade;
    }
  }
  return null;
};
