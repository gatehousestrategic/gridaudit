// populate-counties.js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// Run this once locally to populate all US counties from the Census Bureau API
// Usage: node populate-counties.js

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlohdnjxemwpnnkxnhqx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY_HERE';

const STATE_CODES = {
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE',
  '12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS',
  '21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN','28':'MS',
  '29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY',
  '37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC',
  '46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV',
  '55':'WI','56':'WY'
};

async function fetchAllCounties() {
  console.log('Fetching all US counties from Census Bureau API...');
  
  // Census Bureau API - all counties
  const url = 'https://api.census.gov/data/2020/dec/pl?get=NAME&for=county:*';
  
  const res = await fetch(url);
  const data = await res.json();
  
  // data[0] is headers, rest is data
  // Each row: [NAME, state_fips, county_fips]
  const counties = data.slice(1).map(row => {
    const name = row[0].split(',')[0].trim()
      .replace(' County', '')
      .replace(' Parish', '')
      .replace(' Borough', ' Borough')
      .replace(' Census Area', ' Census Area')
      .replace(' Municipality', ' Municipality')
      .trim();
    const stateFips = row[1];
    const stateCode = STATE_CODES[stateFips];
    return { name, stateCode };
  }).filter(c => c.stateCode); // filter out DC etc

  console.log(`Found ${counties.length} counties`);
  return counties;
}

async function insertCounties(counties) {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < counties.length; i += batchSize) {
    const batch = counties.slice(i, i + batchSize);
    const { error } = await sb.from('counties').upsert(
      batch.map(c => ({ state_code: c.stateCode, name: c.name })),
      { onConflict: 'state_code,name', ignoreDuplicates: true }
    );
    
    if (error) {
      console.error(`Error inserting batch ${i}-${i+batchSize}:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${counties.length} counties...`);
    }
  }

  console.log('Done! All counties inserted.');
}

async function linkUtilitiesToCounties() {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('\nLinking utilities to counties...');

  // Get all utilities
  const { data: utilities } = await sb.from('utilities').select('id, name, state_code, type');
  
  // Get all counties
  const { data: counties } = await sb.from('counties').select('id, name, state_code');

  // Map utilities to counties they serve
  // This is a simplified mapping - major utilities typically serve most counties in their state
  // You can refine this later for more precise service territory mapping
  const utilityCountyMappings = {
    // NY - Con Edison serves NYC metro
    'Con Edison': ['New York', 'Bronx', 'Kings', 'Queens', 'Richmond', 'Westchester', 'Rockland'],
    'National Grid NY': ['Nassau', 'Suffolk', 'Albany', 'Rensselaer', 'Schenectady', 'Saratoga', 'Montgomery', 'Fulton', 'Hamilton', 'Warren', 'Washington', 'Greene', 'Columbia', 'Ulster', 'Dutchess', 'Putnam', 'Niagara', 'Erie', 'Chautauqua', 'Cattaraugus', 'Allegany', 'Wyoming', 'Genesee', 'Orleans', 'Monroe', 'Livingston', 'Ontario', 'Yates', 'Schuyler', 'Chemung', 'Steuben', 'Allegany'],
    'Central Hudson': ['Dutchess', 'Ulster', 'Orange', 'Sullivan', 'Greene', 'Columbia', 'Putnam'],
    'NYSEG': ['Broome', 'Chemung', 'Chenango', 'Cortland', 'Delaware', 'Otsego', 'Schoharie', 'Tioga', 'Tompkins', 'Steuben', 'Schuyler', 'Yates', 'Livingston', 'Ontario', 'Seneca', 'Wayne', 'Cayuga', 'Onondaga', 'Madison', 'Oneida', 'Herkimer', 'Lewis', 'Jefferson', 'St. Lawrence', 'Franklin', 'Clinton', 'Essex'],
    'Orange & Rockland': ['Orange', 'Rockland', 'Sullivan'],
    // NJ
    'PSE&G': ['Essex', 'Hudson', 'Union', 'Middlesex', 'Somerset', 'Morris', 'Bergen', 'Passaic', 'Sussex', 'Warren', 'Hunterdon', 'Mercer', 'Monmouth', 'Ocean', 'Burlington', 'Camden', 'Gloucester', 'Salem', 'Cumberland', 'Atlantic', 'Cape May'],
    'Jersey Central Power & Light': ['Mercer', 'Monmouth', 'Ocean', 'Morris', 'Somerset', 'Hunterdon', 'Warren', 'Sussex'],
    'Atlantic City Electric': ['Atlantic', 'Burlington', 'Camden', 'Cape May', 'Cumberland', 'Gloucester', 'Salem'],
    // PA
    'PECO Energy': ['Philadelphia', 'Bucks', 'Chester', 'Delaware', 'Montgomery'],
    'PPL Electric': ['Northampton', 'Lehigh', 'Berks', 'Carbon', 'Monroe', 'Pike', 'Wayne', 'Lackawanna', 'Luzerne', 'Wyoming', 'Susquehanna', 'Columbia', 'Montour', 'Northumberland', 'Schuylkill', 'Dauphin', 'Lebanon', 'York', 'Lancaster'],
    'West Penn Power': ['Allegheny', 'Beaver', 'Butler', 'Armstrong', 'Indiana', 'Westmoreland', 'Fayette', 'Greene', 'Washington'],
    'Philadelphia Gas Works': ['Philadelphia'],
    // FL - statewide utilities
    'Florida Power & Light': ['Miami-Dade', 'Broward', 'Palm Beach', 'Martin', 'St. Lucie', 'Indian River', 'Okeechobee', 'Glades', 'Hendry', 'Lee', 'Collier', 'Monroe'],
    'Duke Energy Florida': ['Hillsborough', 'Pinellas', 'Pasco', 'Hernando', 'Citrus', 'Levy', 'Marion', 'Alachua', 'Gilchrist', 'Dixie', 'Sumter', 'Lake', 'Orange', 'Osceola', 'Polk', 'Highlands', 'Hardee'],
    'Tampa Electric': ['Hillsborough', 'Polk', 'Pasco', 'Pinellas'],
    'Florida City Gas': ['Miami-Dade', 'Broward', 'Palm Beach', 'Monroe', 'Collier', 'Lee', 'Charlotte', 'Sarasota', 'Manatee', 'Hillsborough'],
    // CA
    'Pacific Gas & Electric': ['Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa', 'Contra Costa', 'Del Norte', 'El Dorado', 'Fresno', 'Glenn', 'Humboldt', 'Kings', 'Lake', 'Lassen', 'Madera', 'Marin', 'Mariposa', 'Mendocino', 'Merced', 'Modoc', 'Mono', 'Monterey', 'Napa', 'Nevada', 'Placer', 'Plumas', 'Sacramento', 'San Benito', 'San Francisco', 'San Joaquin', 'San Luis Obispo', 'San Mateo', 'Santa Barbara', 'Santa Clara', 'Santa Cruz', 'Shasta', 'Sierra', 'Siskiyou', 'Solano', 'Sonoma', 'Stanislaus', 'Tehama', 'Trinity', 'Tulare', 'Tuolumne', 'Yolo', 'Yuba'],
    'Southern California Edison': ['Imperial', 'Inyo', 'Kern', 'Los Angeles', 'Orange', 'Riverside', 'San Bernardino', 'San Diego', 'Santa Barbara', 'Ventura'],
    'San Diego Gas & Electric': ['San Diego', 'Orange'],
    'Southern California Gas': ['Imperial', 'Inyo', 'Kern', 'Los Angeles', 'Orange', 'Riverside', 'San Bernardino', 'San Diego', 'Santa Barbara', 'Ventura'],
    // TX
    'Oncor Electric': ['Dallas', 'Tarrant', 'Collin', 'Denton', 'Ellis', 'Johnson', 'Parker', 'Rockwall', 'Kaufman', 'Hunt', 'Henderson', 'Van Zandt', 'Rains', 'Hopkins', 'Wood', 'Upshur', 'Gregg', 'Smith', 'Cherokee', 'Anderson', 'Navarro', 'Hill', 'Bosque', 'McLennan', 'Falls', 'Limestone', 'Freestone', 'Leon', 'Robertson', 'Milam', 'Bell', 'Coryell', 'Hamilton', 'Comanche', 'Erath', 'Somervell', 'Hood', 'Palo Pinto'],
    'CenterPoint Energy': ['Harris', 'Fort Bend', 'Montgomery', 'Brazoria', 'Galveston', 'Waller', 'Austin', 'Colorado', 'Wharton', 'Matagorda'],
    'AEP Texas': ['Bexar', 'Webb', 'Nueces', 'El Paso', 'Hidalgo', 'Cameron', 'Willacy', 'Starr', 'Zapata', 'Jim Hogg', 'Brooks', 'Kenedy', 'Kleberg', 'Jim Wells', 'Duval', 'San Patricio', 'Aransas', 'Refugio', 'Victoria', 'Calhoun', 'Jackson', 'Lavaca', 'Fayette', 'Bastrop', 'Lee', 'Burleson', 'Brazos', 'Grimes', 'Madison', 'Walker', 'San Jacinto', 'Polk', 'Tyler', 'Jasper', 'Newton', 'Orange', 'Hardin', 'Jefferson', 'Chambers'],
    // IL
    'ComEd': ['Cook', 'DuPage', 'Kane', 'Lake', 'McHenry', 'Will', 'Kendall', 'Grundy', 'DeKalb', 'Boone', 'Winnebago', 'Stephenson', 'Jo Daviess', 'Carroll', 'Whiteside', 'Lee', 'Ogle', 'Bureau', 'LaSalle', 'Putnam', 'Marshall', 'Stark', 'Peoria', 'Woodford', 'Tazewell', 'McLean', 'Livingston', 'Iroquois', 'Kankakee', 'Ford'],
    'Ameren Illinois': ['Adams', 'Alexander', 'Bond', 'Brown', 'Calhoun', 'Cass', 'Champaign', 'Christian', 'Clark', 'Clay', 'Clinton', 'Coles', 'Crawford', 'Cumberland', 'DeWitt', 'Douglas', 'Edgar', 'Edwards', 'Effingham', 'Fayette', 'Franklin', 'Fulton', 'Gallatin', 'Greene', 'Hamilton', 'Hancock', 'Hardin', 'Henderson', 'Henry', 'Jackson', 'Jasper', 'Jefferson', 'Jersey', 'Johnson', 'Knox', 'Lawrence', 'Logan', 'Macon', 'Macoupin', 'Madison', 'Marion', 'Mason', 'Massac', 'McDonough', 'Menard', 'Mercer', 'Monroe', 'Montgomery', 'Morgan', 'Moultrie', 'Perry', 'Piatt', 'Pike', 'Pope', 'Pulaski', 'Randolph', 'Richland', 'Rock Island', 'Saline', 'Sangamon', 'Schuyler', 'Scott', 'Shelby', 'St. Clair', 'Union', 'Vermilion', 'Wabash', 'Warren', 'Washington', 'Wayne', 'White', 'Williamson'],
    // OH
    'AEP Ohio': ['Franklin', 'Delaware', 'Union', 'Madison', 'Pickaway', 'Fayette', 'Ross', 'Pike', 'Scioto', 'Lawrence', 'Gallia', 'Meigs', 'Athens', 'Hocking', 'Vinton', 'Jackson', 'Muskingum', 'Guernsey', 'Noble', 'Morgan', 'Washington', 'Wood', 'Henry', 'Defiance', 'Williams', 'Fulton', 'Lucas', 'Ottawa', 'Sandusky', 'Erie', 'Huron', 'Lorain', 'Medina', 'Wayne', 'Holmes', 'Coshocton', 'Tuscarawas', 'Carroll', 'Columbiana', 'Jefferson', 'Belmont', 'Monroe'],
    'FirstEnergy Ohio': ['Cuyahoga', 'Summit', 'Portage', 'Geauga', 'Lake', 'Ashtabula', 'Trumbull', 'Mahoning', 'Stark', 'Canton'],
    'Duke Energy Ohio': ['Hamilton', 'Butler', 'Warren', 'Clermont', 'Brown', 'Adams', 'Highland'],
    'Dominion Energy Ohio': ['Cuyahoga', 'Summit', 'Portage', 'Geauga', 'Lake', 'Ashtabula', 'Trumbull', 'Mahoning'],
    // MA
    'Eversource MA': ['Middlesex', 'Norfolk', 'Suffolk', 'Essex', 'Worcester', 'Bristol', 'Plymouth', 'Barnstable', 'Dukes', 'Nantucket', 'Hampden', 'Hampshire', 'Franklin'],
    'National Grid MA': ['Worcester', 'Middlesex', 'Essex', 'Suffolk', 'Norfolk', 'Plymouth', 'Bristol'],
    // GA
    'Georgia Power': ['Appling', 'Atkinson', 'Bacon', 'Baker', 'Baldwin', 'Banks', 'Barrow', 'Bartow', 'Ben Hill', 'Berrien', 'Bibb', 'Bleckley', 'Brantley', 'Brooks', 'Bryan', 'Bulloch', 'Burke', 'Butts', 'Calhoun', 'Camden', 'Candler', 'Carroll', 'Catoosa', 'Charlton', 'Chatham', 'Chattahoochee', 'Chattooga', 'Cherokee', 'Clarke', 'Clay', 'Clayton', 'Clinch', 'Cobb', 'Coffee', 'Colquitt', 'Columbia', 'Cook', 'Coweta', 'Crawford', 'Crisp', 'Dade', 'Dawson', 'Decatur', 'DeKalb', 'Dodge', 'Dooly', 'Dougherty', 'Douglas', 'Early', 'Echols', 'Effingham', 'Elbert', 'Emanuel', 'Evans', 'Fannin', 'Fayette', 'Floyd', 'Forsyth', 'Franklin', 'Fulton', 'Gilmer', 'Glascock', 'Glynn', 'Gordon', 'Grady', 'Greene', 'Gwinnett', 'Habersham', 'Hall', 'Hancock', 'Haralson', 'Harris', 'Hart', 'Heard', 'Henry', 'Houston', 'Irwin', 'Jackson', 'Jasper', 'Jeff Davis', 'Jefferson', 'Jenkins', 'Johnson', 'Jones', 'Lamar', 'Lanier', 'Laurens', 'Lee', 'Liberty', 'Lincoln', 'Long', 'Lowndes', 'Lumpkin', 'McDuffie', 'McIntosh', 'Macon', 'Madison', 'Marion', 'Meriwether', 'Miller', 'Mitchell', 'Monroe', 'Montgomery', 'Morgan', 'Murray', 'Muscogee', 'Newton', 'Oconee', 'Oglethorpe', 'Paulding', 'Peach', 'Pickens', 'Pierce', 'Pike', 'Polk', 'Pulaski', 'Putnam', 'Quitman', 'Rabun', 'Randolph', 'Richmond', 'Rockdale', 'Schley', 'Screven', 'Seminole', 'Spalding', 'Stephens', 'Stewart', 'Sumter', 'Talbot', 'Taliaferro', 'Tattnall', 'Taylor', 'Telfair', 'Terrell', 'Thomas', 'Tift', 'Toombs', 'Towns', 'Treutlen', 'Troup', 'Turner', 'Twiggs', 'Union', 'Upson', 'Walker', 'Walton', 'Ware', 'Warren', 'Washington', 'Wayne', 'Webster', 'Wheeler', 'White', 'Whitfield', 'Wilcox', 'Wilkes', 'Wilkinson', 'Worth'],
    'Atlanta Gas Light': ['Fulton', 'DeKalb', 'Cobb', 'Gwinnett', 'Clayton', 'Cherokee', 'Forsyth', 'Hall', 'Henry', 'Paulding', 'Carroll', 'Coweta', 'Fayette', 'Douglas', 'Rockdale', 'Newton', 'Barrow', 'Bartow', 'Spalding', 'Butts', 'Lamar', 'Pike', 'Upson', 'Meriwether', 'Troup', 'Harris', 'Muscogee', 'Chattahoochee', 'Marion', 'Taylor', 'Crawford', 'Bibb', 'Monroe', 'Jones', 'Putnam', 'Jasper', 'Morgan', 'Walton', 'Oconee', 'Clarke', 'Jackson', 'Madison', 'Elbert', 'Hart', 'Franklin', 'Banks', 'Habersham', 'White', 'Stephens', 'Rabun', 'Towns', 'Union', 'Lumpkin', 'Dawson', 'Pickens', 'Gilmer', 'Fannin', 'Murray', 'Whitfield', 'Gordon', 'Floyd', 'Polk', 'Haralson', 'Heard', 'Troup'],
    // MI
    'DTE Energy': ['Wayne', 'Oakland', 'Macomb', 'Monroe', 'Washtenaw', 'Livingston', 'St. Clair', 'Lapeer'],
    'Consumers Energy': ['Ingham', 'Eaton', 'Clinton', 'Shiawassee', 'Genesee', 'Saginaw', 'Bay', 'Midland', 'Isabella', 'Clare', 'Osceola', 'Mecosta', 'Montcalm', 'Ionia', 'Kent', 'Ottawa', 'Muskegon', 'Newaygo', 'Oceana', 'Mason', 'Lake', 'Manistee', 'Wexford', 'Missaukee', 'Roscommon', 'Kalkaska', 'Grand Traverse', 'Antrim', 'Charlevoix', 'Emmet', 'Cheboygan', 'Otsego', 'Montmorency', 'Alpena', 'Presque Isle', 'Jackson', 'Hillsdale', 'Branch', 'St. Joseph', 'Cass', 'Berrien', 'Van Buren', 'Allegan', 'Barry', 'Kalamazoo', 'Calhoun'],
    // NC
    'Duke Energy Carolinas': ['Mecklenburg', 'Gaston', 'Lincoln', 'Catawba', 'Iredell', 'Rowan', 'Cabarrus', 'Union', 'Anson', 'Stanly', 'Montgomery', 'Randolph', 'Davidson', 'Forsyth', 'Davie', 'Yadkin', 'Surry', 'Stokes', 'Rockingham', 'Alamance', 'Guilford', 'Caswell', 'Person', 'Orange', 'Chatham', 'Lee', 'Moore', 'Richmond', 'Scotland', 'Hoke', 'Robeson', 'Cumberland', 'Harnett', 'Johnston', 'Wake', 'Durham', 'Granville', 'Vance', 'Warren', 'Franklin', 'Nash', 'Wilson', 'Edgecombe', 'Halifax'],
    'Duke Energy Progress': ['Wake', 'Durham', 'Orange', 'Chatham', 'Johnston', 'Harnett', 'Cumberland', 'Sampson', 'Duplin', 'Lenoir', 'Wayne', 'Greene', 'Pitt', 'Craven', 'Jones', 'Onslow', 'Carteret', 'Pamlico', 'Beaufort', 'Hyde', 'Dare', 'Washington', 'Tyrrell', 'Bertie', 'Hertford', 'Northampton', 'Gates', 'Chowan', 'Perquimans', 'Pasquotank', 'Camden', 'Currituck'],
    // VA
    'Dominion Energy VA': ['Fairfax', 'Prince William', 'Arlington', 'Alexandria', 'Loudoun', 'Fauquier', 'Culpeper', 'Orange', 'Spotsylvania', 'Stafford', 'King George', 'Westmoreland', 'Richmond', 'Essex', 'Middlesex', 'Gloucester', 'Mathews', 'Lancaster', 'Northumberland', 'Westmoreland', 'King William', 'King and Queen', 'Caroline', 'Hanover', 'Henrico', 'Richmond City', 'Chesterfield', 'Colonial Heights', 'Petersburg', 'Hopewell', 'Prince George', 'Surry', 'Sussex', 'Greensville', 'Emporia', 'Brunswick', 'Mecklenburg', 'Halifax', 'Pittsylvania', 'Danville', 'Henry', 'Patrick', 'Franklin', 'Rocky Mount', 'Floyd', 'Montgomery', 'Radford', 'Pulaski', 'Wythe', 'Bland', 'Grayson', 'Carroll', 'Galax', 'Giles', 'Craig', 'Roanoke', 'Roanoke City', 'Salem', 'Botetourt', 'Bedford', 'Bedford City', 'Amherst', 'Lynchburg', 'Campbell', 'Appomattox', 'Prince Edward', 'Nottoway', 'Lunenburg', 'Charlotte', 'Halifax', 'South Boston', 'Amelia', 'Powhatan', 'Goochland', 'Fluvanna', 'Louisa', 'Albemarle', 'Charlottesville', 'Greene', 'Madison', 'Rappahannock', 'Warren', 'Shenandoah', 'Page', 'Rockingham', 'Harrisonburg', 'Augusta', 'Waynesboro', 'Staunton', 'Bath', 'Highland', 'Alleghany', 'Covington', 'Clifton Forge', 'Rockbridge', 'Buena Vista', 'Lexington', 'Nelson', 'Buckingham', 'Cumberland'],
    'Appalachian Power': ['Buchanan', 'Dickenson', 'Russell', 'Tazewell', 'Smyth', 'Washington', 'Bristol', 'Lee', 'Scott', 'Wise', 'Norton', 'Grayson', 'Carroll', 'Galax', 'Floyd', 'Pulaski', 'Wythe', 'Bland', 'Giles', 'Craig', 'Montgomery', 'Radford'],
    // WA
    'Puget Sound Energy': ['King', 'Pierce', 'Snohomish', 'Kitsap', 'Mason', 'Thurston', 'Whatcom', 'Skagit', 'San Juan', 'Island', 'Clallam', 'Jefferson'],
    'Pacific Power WA': ['Clark', 'Skamania', 'Klickitat', 'Yakima', 'Kittitas', 'Chelan', 'Douglas', 'Okanogan', 'Ferry', 'Stevens', 'Pend Oreille', 'Lincoln', 'Spokane', 'Adams', 'Grant', 'Franklin', 'Benton', 'Walla Walla', 'Columbia', 'Garfield', 'Asotin', 'Whitman'],
    // CO
    'Xcel Energy CO': ['Denver', 'Arapahoe', 'Jefferson', 'Adams', 'Boulder', 'Broomfield', 'Douglas', 'El Paso', 'Pueblo', 'Larimer', 'Weld', 'Morgan', 'Logan', 'Sedgwick', 'Phillips', 'Yuma', 'Washington', 'Kit Carson', 'Cheyenne', 'Kiowa', 'Crowley', 'Otero', 'Bent', 'Prowers', 'Baca', 'Las Animas', 'Huerfano', 'Custer', 'Fremont', 'Teller'],
    'Black Hills Energy CO': ['Pueblo', 'Fremont', 'Custer', 'Huerfano', 'Las Animas'],
    // MN
    'Xcel Energy MN': ['Hennepin', 'Ramsey', 'Dakota', 'Anoka', 'Washington', 'Scott', 'Carver', 'Wright', 'Sherburne', 'Benton', 'Stearns', 'Morrison', 'Todd', 'Wadena', 'Otter Tail', 'Grant', 'Traverse', 'Big Stone', 'Swift', 'Chippewa', 'Lac qui Parle', 'Yellow Medicine', 'Redwood', 'Renville', 'Kandiyohi', 'Meeker', 'McLeod', 'Sibley', 'Nicollet', 'Brown', 'Watonwan', 'Blue Earth', 'Le Sueur', 'Rice', 'Steele', 'Dodge', 'Olmsted', 'Winona', 'Houston', 'Fillmore', 'Mower', 'Freeborn', 'Faribault', 'Martin', 'Jackson', 'Nobles', 'Rock', 'Pipestone', 'Murray', 'Cottonwood', 'Lincoln'],
    'Minnesota Power': ['St. Louis', 'Lake', 'Cook', 'Carlton', 'Pine', 'Aitkin', 'Itasca', 'Koochiching', 'Beltrami', 'Clearwater', 'Mahnomen', 'Norman', 'Polk', 'Red Lake', 'Pennington', 'Marshall', 'Roseau', 'Lake of the Woods'],
    // MD
    'Pepco': ['Montgomery', 'Prince George\'s'],
    'Baltimore Gas & Electric': ['Anne Arundel', 'Baltimore', 'Baltimore City', 'Carroll', 'Frederick', 'Harford', 'Howard', 'Queen Anne\'s'],
    // CT
    'Eversource CT': ['Hartford', 'Tolland', 'Windham', 'Middlesex', 'New London', 'New Haven', 'Litchfield', 'Fairfield'],
    'United Illuminating': ['New Haven', 'Fairfield'],
    'Avangrid CT': ['Hartford', 'Tolland', 'Windham', 'Middlesex', 'New London', 'Litchfield']
  };

  let linked = 0;
  for (const utility of utilities) {
    const countyNames = utilityCountyMappings[utility.name];
    if (!countyNames) {
      console.log(`No county mapping for ${utility.name} — skipping`);
      continue;
    }

    const stateCounties = counties.filter(c => 
      c.state_code === utility.state_code && 
      countyNames.some(n => c.name.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(c.name.toLowerCase()))
    );

    if (stateCounties.length === 0) {
      console.log(`No counties found for ${utility.name} in ${utility.state_code}`);
      continue;
    }

    const mappings = stateCounties.map(c => ({
      utility_id: utility.id,
      county_id: c.id
    }));

    const { error } = await sb.from('utility_counties').upsert(mappings, { 
      onConflict: 'utility_id,county_id', 
      ignoreDuplicates: true 
    });

    if (error) {
      console.error(`Error linking ${utility.name}:`, error.message);
    } else {
      linked += mappings.length;
      console.log(`Linked ${utility.name} to ${mappings.length} counties`);
    }
  }

  console.log(`\nTotal utility-county links created: ${linked}`);
}

async function main() {
  try {
    const counties = await fetchAllCounties();
    await insertCounties(counties);
    await linkUtilitiesToCounties();
    console.log('\n✓ County population complete!');
  } catch(e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

main();
