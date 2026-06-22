-- ── MIGRATION 003: Seed Data ─────────────────────────────────
-- All 50 states + major utilities + counties
-- Rate schedules are populated by the cron job after initial setup

-- ── ALL 50 STATES ────────────────────────────────────────────
insert into public.states (code, name, puc_name, puc_url) values
('AL','Alabama','Public Service Commission','https://www.psc.state.al.us'),
('AK','Alaska','Regulatory Commission of Alaska','https://rca.alaska.gov'),
('AZ','Arizona','Corporation Commission','https://www.azcc.gov'),
('AR','Arkansas','Public Service Commission','https://www.apscservices.info'),
('CA','California','Public Utilities Commission','https://www.cpuc.ca.gov'),
('CO','Colorado','Public Utilities Commission','https://puc.colorado.gov'),
('CT','Connecticut','Public Utilities Regulatory Authority','https://portal.ct.gov/PURA'),
('DE','Delaware','Public Service Commission','https://depsc.delaware.gov'),
('FL','Florida','Public Service Commission','https://www.floridapsc.com'),
('GA','Georgia','Public Service Commission','https://psc.ga.gov'),
('HI','Hawaii','Public Utilities Commission','https://puc.hawaii.gov'),
('ID','Idaho','Public Utilities Commission','https://puc.idaho.gov'),
('IL','Illinois','Commerce Commission','https://www.icc.illinois.gov'),
('IN','Indiana','Utility Regulatory Commission','https://www.in.gov/iurc'),
('IA','Iowa','Utilities Board','https://iub.iowa.gov'),
('KS','Kansas','Corporation Commission','https://kcc.ks.gov'),
('KY','Kentucky','Public Service Commission','https://psc.ky.gov'),
('LA','Louisiana','Public Service Commission','https://lpsc.louisiana.gov'),
('ME','Maine','Public Utilities Commission','https://www.maine.gov/mpuc'),
('MD','Maryland','Public Service Commission','https://www.psc.state.md.us'),
('MA','Massachusetts','Department of Public Utilities','https://www.mass.gov/orgs/department-of-public-utilities'),
('MI','Michigan','Public Service Commission','https://www.michigan.gov/mpsc'),
('MN','Minnesota','Public Utilities Commission','https://mn.gov/puc'),
('MS','Mississippi','Public Service Commission','https://www.psc.state.ms.us'),
('MO','Missouri','Public Service Commission','https://psc.mo.gov'),
('MT','Montana','Public Service Commission','https://psc.mt.gov'),
('NE','Nebraska','Public Service Commission','https://psc.nebraska.gov'),
('NV','Nevada','Public Utilities Commission','https://puc.nv.gov'),
('NH','New Hampshire','Public Utilities Commission','https://www.puc.nh.gov'),
('NJ','New Jersey','Board of Public Utilities','https://www.nj.gov/bpu'),
('NM','New Mexico','Public Regulation Commission','https://www.nmprc.state.nm.us'),
('NY','New York','Public Service Commission','https://www.dps.ny.gov'),
('NC','North Carolina','Utilities Commission','https://www.ncuc.net'),
('ND','North Dakota','Public Service Commission','https://www.psc.nd.gov'),
('OH','Ohio','Public Utilities Commission','https://puco.ohio.gov'),
('OK','Oklahoma','Corporation Commission','https://www.occeweb.com'),
('OR','Oregon','Public Utility Commission','https://www.oregon.gov/puc'),
('PA','Pennsylvania','Public Utility Commission','https://www.puc.pa.gov'),
('RI','Rhode Island','Public Utilities Commission','https://ripuc.ri.gov'),
('SC','South Carolina','Public Service Commission','https://www.psc.sc.gov'),
('SD','South Dakota','Public Utilities Commission','https://puc.sd.gov'),
('TN','Tennessee','Regulatory Authority','https://www.tn.gov/tra'),
('TX','Texas','Public Utility Commission','https://www.puc.texas.gov'),
('UT','Utah','Public Service Commission','https://psc.utah.gov'),
('VT','Vermont','Public Utility Commission','https://puc.vermont.gov'),
('VA','Virginia','State Corporation Commission','https://www.scc.virginia.gov'),
('WA','Washington','Utilities and Transportation Commission','https://www.utc.wa.gov'),
('WV','West Virginia','Public Service Commission','https://www.psc.state.wv.us'),
('WI','Wisconsin','Public Service Commission','https://psc.wi.gov'),
('WY','Wyoming','Public Service Commission','https://psc.wyo.gov');

-- ── MAJOR UTILITIES BY STATE ──────────────────────────────────
-- Electric utilities (primary investor-owned utilities per state)
-- Note: municipal utilities and co-ops are added per county as needed

insert into public.utilities (state_code, name, type, puc_filing_url, rate_page_url) values
-- NY
('NY','Con Edison','electric','https://www.dps.ny.gov/pscedocket/actions/docketSearch.cfm','https://www.coned.com/en/accounts-billing/your-bill/rates'),
('NY','National Grid NY','electric','https://www.dps.ny.gov/pscedocket/actions/docketSearch.cfm','https://www.nationalgridus.com/ny-home/rates-and-tariffs'),
('NY','Central Hudson','electric','https://www.dps.ny.gov/pscedocket/actions/docketSearch.cfm','https://www.cenhud.com/my-account/rates-tariffs'),
('NY','NYSEG','electric','https://www.dps.ny.gov/pscedocket/actions/docketSearch.cfm','https://www.nyseg.com/my-account/rates-tariffs'),
('NY','Orange & Rockland','electric','https://www.dps.ny.gov/pscedocket/actions/docketSearch.cfm','https://www.oru.com/my-account/rates-tariffs'),
('NY','Con Edison','gas','https://www.dps.ny.gov/pscedocket/actions/docketSearch.cfm','https://www.coned.com/en/accounts-billing/your-bill/rates'),
('NY','National Grid NY','gas','https://www.dps.ny.gov/pscedocket/actions/docketSearch.cfm','https://www.nationalgridus.com/ny-home/rates-and-tariffs'),
-- NJ
('NJ','PSE&G','electric','https://www.nj.gov/bpu/filing','https://www.pseg.com/home/products_services/business/tariffs'),
('NJ','Jersey Central Power & Light','electric','https://www.nj.gov/bpu/filing','https://www.firstenergycorp.com/content/customer/help/billing_and_rates/rates/new_jersey/jersey_central_power_light.html'),
('NJ','Atlantic City Electric','electric','https://www.nj.gov/bpu/filing','https://www.atlanticcityelectric.com/en/home/billing-payment/rates-and-tariffs.html'),
('NJ','PSE&G','gas','https://www.nj.gov/bpu/filing','https://www.pseg.com/home/products_services/business/tariffs'),
-- PA
('PA','PECO Energy','electric','https://www.puc.pa.gov/filing-resources','https://www.peco.com/ways-to-save/rates-tariffs'),
('PA','PPL Electric','electric','https://www.puc.pa.gov/filing-resources','https://www.pplelectric.com/my-account/rates-and-tariffs'),
('PA','West Penn Power','electric','https://www.puc.pa.gov/filing-resources','https://www.firstenergycorp.com/content/customer/help/billing_and_rates/rates/pennsylvania/west_penn_power.html'),
('PA','PECO Energy','gas','https://www.puc.pa.gov/filing-resources','https://www.peco.com/ways-to-save/rates-tariffs'),
('PA','Philadelphia Gas Works','gas','https://www.puc.pa.gov/filing-resources','https://www.pgworks.com/index.aspx?NID=138'),
-- FL
('FL','Florida Power & Light','electric','https://www.floridapsc.com/utilities','https://www.fpl.com/rates.html'),
('FL','Duke Energy Florida','electric','https://www.floridapsc.com/utilities','https://www.duke-energy.com/home/billing/rates-and-tariffs'),
('FL','Tampa Electric','electric','https://www.floridapsc.com/utilities','https://www.tampaelectric.com/company/ourrates'),
('FL','Florida City Gas','gas','https://www.floridapsc.com/utilities','https://www.floridacitygas.com/home/billing/rates-and-tariffs'),
-- CA
('CA','Pacific Gas & Electric','electric','https://www.cpuc.ca.gov/industries-and-topics/electrical-energy/electric-rates','https://www.pge.com/en_US/business/rate-plans/rate-plans/what-are-rate-plans.page'),
('CA','Southern California Edison','electric','https://www.cpuc.ca.gov/industries-and-topics/electrical-energy/electric-rates','https://www.sce.com/business/rates'),
('CA','San Diego Gas & Electric','electric','https://www.cpuc.ca.gov/industries-and-topics/electrical-energy/electric-rates','https://www.sdge.com/rates-and-regulations/current-rates'),
('CA','Pacific Gas & Electric','gas','https://www.cpuc.ca.gov','https://www.pge.com/en_US/business/rate-plans/rate-plans/what-are-rate-plans.page'),
('CA','Southern California Gas','gas','https://www.cpuc.ca.gov','https://www.socalgas.com/for-your-business/rates-and-tariffs'),
-- TX
('TX','Oncor Electric','electric','https://interchange.puc.texas.gov','https://www.oncor.com/EN/Business/Pages/rates.aspx'),
('TX','CenterPoint Energy','electric','https://interchange.puc.texas.gov','https://www.centerpointenergy.com/en-us/business/pages/rates-tariffs.aspx'),
('TX','AEP Texas','electric','https://interchange.puc.texas.gov','https://www.aeptexas.com/rates'),
('TX','CenterPoint Energy','gas','https://interchange.puc.texas.gov','https://www.centerpointenergy.com/en-us/business/pages/rates-tariffs.aspx'),
-- IL
('IL','ComEd','electric','https://www.icc.illinois.gov/dockets','https://www.comed.com/MyAccount/MyBillUsage/Pages/CurrentRates.aspx'),
('IL','Ameren Illinois','electric','https://www.icc.illinois.gov/dockets','https://www.ameren.com/illinois/account/rates-and-tariffs'),
('IL','Nicor Gas','gas','https://www.icc.illinois.gov/dockets','https://www.nicorgas.com/my-account/rates-and-tariffs.html'),
('IL','Peoples Gas','gas','https://www.icc.illinois.gov/dockets','https://www.peoplesgasdelivery.com/account/rates-and-tariffs'),
-- OH
('OH','AEP Ohio','electric','https://puco.ohio.gov/utilities','https://www.aepohio.com/account/bills/rates'),
('OH','FirstEnergy Ohio','electric','https://puco.ohio.gov/utilities','https://www.firstenergycorp.com/content/customer/help/billing_and_rates/rates/ohio.html'),
('OH','Duke Energy Ohio','electric','https://puco.ohio.gov/utilities','https://www.duke-energy.com/home/billing/rates-and-tariffs'),
('OH','Dominion Energy Ohio','gas','https://puco.ohio.gov/utilities','https://www.dominionenergy.com/ohio/billing/rates-tariffs'),
-- MA
('MA','Eversource MA','electric','https://www.mass.gov/orgs/department-of-public-utilities','https://www.eversource.com/content/ema-c/residential/account-billing/manage-bills/rates-tariffs'),
('MA','National Grid MA','electric','https://www.mass.gov/orgs/department-of-public-utilities','https://www.nationalgridus.com/ma-home/rates-and-tariffs'),
('MA','Eversource MA','gas','https://www.mass.gov/orgs/department-of-public-utilities','https://www.eversource.com/content/ema-c/residential/account-billing/manage-bills/rates-tariffs'),
('MA','National Grid MA','gas','https://www.mass.gov/orgs/department-of-public-utilities','https://www.nationalgridus.com/ma-home/rates-and-tariffs'),
-- GA
('GA','Georgia Power','electric','https://psc.ga.gov','https://www.georgiapower.com/company/rates-and-regulations.html'),
('GA','Atlanta Gas Light','gas','https://psc.ga.gov','https://www.atlantagaslight.com/utility-information/rates-tariffs'),
-- MI
('MI','DTE Energy','electric','https://www.michigan.gov/mpsc','https://newlook.dteenergy.com/wps/wcm/connect/dte-web/home/billing-and-payments/business/rates'),
('MI','Consumers Energy','electric','https://www.michigan.gov/mpsc','https://www.consumersenergy.com/business/rates-and-tariffs'),
('MI','DTE Energy','gas','https://www.michigan.gov/mpsc','https://newlook.dteenergy.com/wps/wcm/connect/dte-web/home/billing-and-payments/business/rates'),
('MI','Consumers Energy','gas','https://www.michigan.gov/mpsc','https://www.consumersenergy.com/business/rates-and-tariffs'),
-- NC
('NC','Duke Energy Carolinas','electric','https://www.ncuc.net','https://www.duke-energy.com/home/billing/rates-and-tariffs'),
('NC','Duke Energy Progress','electric','https://www.ncuc.net','https://www.duke-energy.com/home/billing/rates-and-tariffs'),
('NC','Dominion Energy NC','gas','https://www.ncuc.net','https://www.dominionenergy.com/north-carolina/billing/rates-tariffs'),
-- VA
('VA','Dominion Energy VA','electric','https://www.scc.virginia.gov','https://www.dominionenergy.com/virginia/billing/rates-tariffs'),
('VA','Appalachian Power','electric','https://www.scc.virginia.gov','https://appalachianpower.com/info/rates'),
('VA','Washington Gas','gas','https://www.scc.virginia.gov','https://www.washingtongas.com/about-us/rates-and-tariffs'),
-- WA
('WA','Puget Sound Energy','electric','https://www.utc.wa.gov','https://www.pse.com/en/accounts-and-services/your-bill/rates-and-tariffs'),
('WA','Pacific Power WA','electric','https://www.utc.wa.gov','https://www.pacificpower.net/account/billing-payment/rates-tariffs.html'),
('WA','Puget Sound Energy','gas','https://www.utc.wa.gov','https://www.pse.com/en/accounts-and-services/your-bill/rates-and-tariffs'),
-- CO
('CO','Xcel Energy CO','electric','https://puc.colorado.gov','https://www.xcelenergy.com/billing_&_payment/rates_and_regulations'),
('CO','Black Hills Energy CO','electric','https://puc.colorado.gov','https://www.blackhillsenergy.com/rates-and-regulations'),
('CO','Xcel Energy CO','gas','https://puc.colorado.gov','https://www.xcelenergy.com/billing_&_payment/rates_and_regulations'),
-- MN
('MN','Xcel Energy MN','electric','https://mn.gov/puc','https://www.xcelenergy.com/billing_&_payment/rates_and_regulations'),
('MN','Minnesota Power','electric','https://mn.gov/puc','https://www.mnpower.com/CustomerService/Rates'),
('MN','CenterPoint Energy MN','gas','https://mn.gov/puc','https://www.centerpointenergy.com/en-us/business/pages/rates-tariffs.aspx'),
-- MD
('MD','Pepco','electric','https://www.psc.state.md.us','https://www.pepco.com/my-account/billing-and-payments/rates-and-tariffs'),
('MD','Baltimore Gas & Electric','electric','https://www.psc.state.md.us','https://www.bge.com/MyAccount/MyBillUsage/Pages/Rates.aspx'),
('MD','Baltimore Gas & Electric','gas','https://www.psc.state.md.us','https://www.bge.com/MyAccount/MyBillUsage/Pages/Rates.aspx'),
-- CT
('CT','Eversource CT','electric','https://portal.ct.gov/PURA','https://www.eversource.com/content/ct-c/residential/account-billing/manage-bills/rates-tariffs'),
('CT','United Illuminating','electric','https://portal.ct.gov/PURA','https://www.uinet.com/wps/portal/uinet/aboutus/ratesandtariffs'),
('CT','Avangrid CT','gas','https://portal.ct.gov/PURA','https://www.southernctgas.com/residential/billing/tariffs');


-- ── FACILITY EXEMPTIONS (Initial data) ───────────────────────
-- Healthcare exemptions (SNF and assisted living)
insert into public.facility_exemptions (state_code, facility_type, utility_type, exemption_type, exemption_pct, requires_certificate, certificate_form, notes) values
('NY','snf','electric','sales_tax',100,true,'ST-119.1','SNFs exempt from NYS sales tax on utility services'),
('NY','snf','gas','sales_tax',100,true,'ST-119.1','SNFs exempt from NYS sales tax on utility services'),
('NY','assisted','electric','sales_tax',100,true,'ST-119.1','Assisted living facilities exempt from NYS sales tax'),
('NY','assisted','gas','sales_tax',100,true,'ST-119.1','Assisted living facilities exempt from NYS sales tax'),
('NY','manufacturing','electric','sales_tax',100,true,'ST-121','Manufacturing exempt from sales tax on energy used in production'),
('NJ','snf','electric','sales_tax',100,true,'ST-5','Healthcare facilities exempt from NJ sales tax'),
('NJ','snf','gas','sales_tax',100,true,'ST-5','Healthcare facilities exempt from NJ sales tax'),
('NJ','manufacturing','electric','sales_tax',100,true,'ST-4','Manufacturing exempt from NJ sales tax'),
('PA','snf','electric','sales_tax',100,true,'REV-1220','Healthcare facilities exempt from PA sales tax on utilities'),
('PA','snf','gas','sales_tax',100,true,'REV-1220','Healthcare facilities exempt from PA sales tax on utilities'),
('PA','manufacturing','electric','sales_tax',100,true,'REV-1220','Manufacturing exempt from PA sales tax on utilities used in production'),
('FL','snf','electric','sales_tax',100,true,'DR-600036','SNFs may qualify for exemption on electricity used for medical purposes'),
('FL','manufacturing','electric','sales_tax',100,true,'DR-600036','Manufacturing exempt from FL sales tax on electricity used in production'),
('CA','snf','electric','sales_tax',0,false,null,'CA does not impose sales tax on utilities - no exemption needed'),
('CA','manufacturing','electric','sales_tax',0,false,null,'CA does not impose sales tax on utilities'),
('TX','snf','electric','sales_tax',100,true,'01-339','Healthcare facilities exempt from TX sales tax on electricity'),
('TX','snf','gas','sales_tax',100,true,'01-339','Healthcare facilities exempt from TX sales tax on natural gas'),
('TX','manufacturing','electric','sales_tax',100,true,'01-339','Manufacturing exempt from TX sales tax on electricity used in production'),
('IL','snf','electric','sales_tax',100,true,'CRT-61','Healthcare facilities exempt from IL sales tax on utilities'),
('IL','manufacturing','electric','sales_tax',100,true,'CRT-61','Manufacturing exempt on electricity used directly in production'),
('OH','snf','electric','sales_tax',100,true,'STEC-B','Healthcare facilities exempt from OH sales tax on utilities'),
('OH','manufacturing','electric','sales_tax',100,true,'STEC-B','Manufacturing exempt from OH sales tax on utilities used in production'),
('MA','snf','electric','sales_tax',100,false,null,'MA exempts electricity for residential and healthcare use by statute'),
('MA','manufacturing','electric','sales_tax',100,true,'ST-12','Manufacturing exempt from MA sales tax on utilities used in production'),
('GA','snf','electric','sales_tax',100,true,'ST-5','Healthcare facilities exempt from GA sales tax on utilities'),
('GA','manufacturing','electric','sales_tax',100,true,'ST-5','Manufacturing exempt from GA sales tax on energy used in production'),
('MI','snf','electric','sales_tax',100,true,'3372','Healthcare facilities exempt from MI sales tax on utilities'),
('MI','manufacturing','electric','sales_tax',100,true,'3372','Manufacturing exempt from MI use tax on utilities'),
('NC','snf','electric','sales_tax',100,true,'E-595E','Healthcare facilities exempt from NC sales tax on utilities'),
('NC','manufacturing','electric','sales_tax',100,true,'E-595E','Manufacturing exempt from NC sales tax on electricity'),
('VA','snf','electric','sales_tax',100,true,'ST-12','Healthcare facilities exempt from VA sales tax'),
('VA','manufacturing','electric','sales_tax',100,true,'ST-11','Manufacturing exempt from VA sales and use tax on utilities'),
('WA','snf','electric','sales_tax',100,true,'REV 27 0032','Healthcare nonprofit facilities may qualify for exemption'),
('CO','snf','electric','sales_tax',100,true,'DR 0715','Healthcare facilities exempt from CO sales tax on utilities'),
('MN','snf','electric','sales_tax',100,true,'ST3','Healthcare facilities exempt from MN sales tax on utilities'),
('MD','snf','electric','sales_tax',100,true,'SUTEC','Healthcare facilities exempt from MD sales tax on utilities'),
('CT','snf','electric','sales_tax',100,true,'CERT-119','Healthcare facilities exempt from CT sales tax on utilities'),
('CT','manufacturing','electric','sales_tax',100,true,'CERT-139','Manufacturing exempt from CT sales tax on electricity used in production');
