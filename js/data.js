
// ================= Bundled datasets, defaults, storage-safe helpers =================
import { validTz, tzOffsetMs } from './engines.js';
export const TZ_VERSION = '2026.1';
export const HOLIDAY_TYPES = ['national', 'religious', 'observance', 'bank', 'regional'];

/* Timezone → representative coordinates [lat, lon, en, ar, countryHint] */
export const TZ_TABLE = {
'Africa/Cairo':[30.0444,31.2357,'Cairo','القاهرة','EG'],'Africa/Alexandria':[31.2001,29.9187,'Alexandria','الإسكندرية','EG'],
'Africa/Casablanca':[33.5731,-7.5898,'Casablanca','الدار البيضاء','MA'],'Africa/Rabat':[34.0209,-6.8416,'Rabat','الرباط','MA'],
'Africa/Algiers':[36.7538,3.0588,'Algiers','الجزائر','DZ'],'Africa/Tunis':[36.8065,10.1815,'Tunis','تونس','TN'],
'Africa/Tripoli':[32.8872,13.1913,'Tripoli','طرابلس','LY'],'Africa/Khartoum':[15.5007,32.5599,'Khartoum','الخرطوم','SD'],
'Africa/Nairobi':[-1.2921,36.8219,'Nairobi','نيروبي','KE'],'Africa/Johannesburg':[-26.2041,28.0473,'Johannesburg','جوهانسبرغ','ZA'],
'Africa/Lagos':[6.5244,3.3792,'Lagos','لاغوس','NG'],'Africa/Addis_Ababa':[9.03,38.74,'Addis Ababa','أديس أبابا','ET'],
'America/New_York':[40.7128,-74.006,'New York','نيويورك','US'],'America/Chicago':[41.8781,-87.6298,'Chicago','شيكاغو','US'],
'America/Denver':[39.7392,-104.9903,'Denver','دنفر','US'],'America/Los_Angeles':[34.0522,-118.2437,'Los Angeles','لوس أنجلوس','US'],
'America/Anchorage':[61.2181,-149.9003,'Anchorage','أنكوراج','US'],'America/Toronto':[43.6532,-79.3832,'Toronto','تورونتو','CA'],
'America/Vancouver':[49.2827,-123.1207,'Vancouver','فانكوفر','CA'],'America/Mexico_City':[19.4326,-99.1332,'Mexico City','مكسيكو سيتي','MX'],
'America/Sao_Paulo':[-23.5505,-46.6333,'São Paulo','ساو باولو','BR'],'America/Buenos_Aires':[-34.6037,-58.3816,'Buenos Aires','بوينس آيرس','AR'],
'America/Argentina/Buenos_Aires':[-34.6037,-58.3816,'Buenos Aires','بوينس آيرس','AR'],'America/Bogota':[4.711,-74.0721,'Bogotá','بوغوتا','CO'],
'America/Lima':[-12.0464,-77.0428,'Lima','ليما','PE'],'Pacific/Honolulu':[21.3069,-157.8583,'Honolulu','هونولولو','US'],
'Europe/London':[51.5072,-0.1276,'London','لندن','GB'],'Europe/Dublin':[53.3498,-6.2603,'Dublin','دبلن','IE'],
'Europe/Paris':[48.8566,2.3522,'Paris','باريس','FR'],'Europe/Berlin':[52.52,13.405,'Berlin','برلين','DE'],
'Europe/Madrid':[40.4168,-3.7038,'Madrid','مدريد','ES'],'Europe/Rome':[41.9028,12.4964,'Rome','روما','IT'],
'Europe/Amsterdam':[52.3676,4.9041,'Amsterdam','أمستردام','NL'],'Europe/Brussels':[50.8503,4.3517,'Brussels','بروكسل','BE'],
'Europe/Zurich':[47.3769,8.5417,'Zurich','زيورخ','CH'],'Europe/Vienna':[48.2082,16.3738,'Vienna','فيينا','AT'],
'Europe/Stockholm':[59.3293,18.0686,'Stockholm','ستوكهولم','SE'],'Europe/Oslo':[59.9139,10.7522,'Oslo','أوسلو','NO'],
'Europe/Helsinki':[60.1699,24.9384,'Helsinki','هلسنكي','FI'],'Europe/Athens':[37.9838,23.7275,'Athens','أثينا','GR'],
'Europe/Istanbul':[41.0082,28.9784,'Istanbul','إسطنبول','TR'],'Europe/Moscow':[55.7558,37.6173,'Moscow','موسكو','RU'],
'Europe/Kyiv':[50.4501,30.5234,'Kyiv','كييف','UA'],'Europe/Kiev':[50.4501,30.5234,'Kyiv','كييف','UA'],
'Europe/Warsaw':[52.2297,21.0122,'Warsaw','وارسو','PL'],'Europe/Prague':[50.0755,14.4378,'Prague','براغ','CZ'],
'Europe/Lisbon':[38.7223,-9.1393,'Lisbon','لشبونة','PT'],'Atlantic/Reykjavik':[64.1466,-21.9426,'Reykjavík','ريكيافيك','IS'],
'Arctic/Longyearbyen':[78.2232,15.6267,'Longyearbyen','لونغيربيين','NO'],
'Asia/Riyadh':[24.7136,46.6753,'Riyadh','الرياض','SA'],'Asia/Dubai':[25.2048,55.2708,'Dubai','دبي','AE'],
'Asia/Muscat':[23.588,58.3829,'Muscat','مسقط','OM'],'Asia/Qatar':[25.2854,51.531,'Doha','الدوحة','QA'],
'Asia/Bahrain':[26.2285,50.586,'Manama','المنامة','BH'],'Asia/Kuwait':[29.3759,47.9774,'Kuwait City','مدينة الكويت','KW'],
'Asia/Baghdad':[33.3152,44.3661,'Baghdad','بغداد','IQ'],'Asia/Amman':[31.9539,35.9106,'Amman','عمّان','JO'],
'Asia/Beirut':[33.8938,35.5018,'Beirut','بيروت','LB'],'Asia/Damascus':[33.5138,36.2765,'Damascus','دمشق','SY'],
'Asia/Gaza':[31.5017,34.4668,'Gaza','غزة','PS'],'Asia/Hebron':[31.5326,35.0998,'Hebron','الخليل','PS'],
'Asia/Jerusalem':[31.7683,35.2137,'Jerusalem','القدس','IL'],'Asia/Tehran':[35.6892,51.389,'Tehran','طهران','IR'],
'Asia/Karachi':[24.8607,67.0011,'Karachi','كراتشي','PK'],'Asia/Kolkata':[28.6139,77.209,'New Delhi','نيودلهي','IN'],
'Asia/Calcutta':[22.5726,88.3639,'Kolkata','كلكتا','IN'],'Asia/Dhaka':[23.8103,90.4125,'Dhaka','دكا','BD'],
'Asia/Kathmandu':[27.7172,85.324,'Kathmandu','كاتماندو','NP'],'Asia/Kabul':[34.5553,69.2075,'Kabul','كابل','AF'],
'Asia/Tashkent':[41.2995,69.2401,'Tashkent','طشقند','UZ'],'Asia/Almaty':[43.222,76.8512,'Almaty','ألماطي','KZ'],
'Asia/Baku':[40.4093,49.8671,'Baku','باكو','AZ'],'Asia/Tbilisi':[41.7151,44.8271,'Tbilisi','تبليسي','GE'],
'Asia/Yerevan':[40.1792,44.4991,'Yerevan','يريفان','AM'],'Asia/Ashgabat':[37.9601,58.3261,'Ashgabat','عشق آباد','TM'],
'Asia/Dushanbe':[38.5598,68.787,'Dushanbe','دوشنبه','TJ'],'Asia/Bishkek':[42.8746,74.5698,'Bishkek','بيشكيك','KG'],
'Asia/Jakarta':[-6.2088,106.8456,'Jakarta','جاكرتا','ID'],'Asia/Pontianak':[-0.0263,109.3425,'Pontianak','بونتياناك','ID'],
'Asia/Makassar':[-5.1477,119.4327,'Makassar','ماكاسار','ID'],'Asia/Jayapura':[-2.5337,140.7181,'Jayapura','جايابورا','ID'],
'Asia/Kuala_Lumpur':[3.139,101.6869,'Kuala Lumpur','كوالالمبور','MY'],'Asia/Singapore':[1.3521,103.8198,'Singapore','سنغافورة','SG'],
'Asia/Bangkok':[13.7563,100.5018,'Bangkok','بانكوك','TH'],'Asia/Ho_Chi_Minh':[10.8231,106.6297,'Ho Chi Minh City','هو تشي منه','VN'],
'Asia/Phnom_Penh':[11.5564,104.9282,'Phnom Penh','بنوم بنه','KH'],'Asia/Yangon':[16.8409,96.1735,'Yangon','يانغون','MM'],
'Asia/Manila':[14.5995,120.9842,'Manila','مانيلا','PH'],'Asia/Shanghai':[31.2304,121.4737,'Shanghai','شنغهاي','CN'],
'Asia/Hong_Kong':[22.3193,114.1694,'Hong Kong','هونغ كونغ','HK'],'Asia/Taipei':[25.033,121.5654,'Taipei','تايبيه','TW'],
'Asia/Seoul':[37.5665,126.978,'Seoul','سيول','KR'],'Asia/Tokyo':[35.6762,139.6503,'Tokyo','طوكيو','JP'],
'Australia/Perth':[-31.9523,115.8613,'Perth','بيرث','AU'],'Australia/Adelaide':[-34.9285,138.6007,'Adelaide','أديليد','AU'],
'Australia/Darwin':[-12.4634,130.8456,'Darwin','داروين','AU'],'Australia/Sydney':[-33.8688,151.2093,'Sydney','سيدني','AU'],
'Australia/Melbourne':[-37.8136,144.9631,'Melbourne','ملبورن','AU'],'Australia/Brisbane':[-27.4698,153.0251,'Brisbane','بريزبن','AU'],
'Pacific/Auckland':[-36.8509,174.7645,'Auckland','أوكلاند','NZ'],'Pacific/Fiji':[-18.1248,178.4501,'Suva','سوفا','FJ'],
'UTC':[0,0,'UTC','ت ع م',null],'Etc/UTC':[0,0,'UTC','ت ع م',null]
};

/* Offline city list [id, lat, lon, tz, en, ar] */
export const CITIES = [
['riyadh',24.7136,46.6753,'Asia/Riyadh','Riyadh','الرياض'],['makkah',21.3891,39.8579,'Asia/Riyadh','Mecca','مكة المكرمة'],
['madinah',24.4672,39.6111,'Asia/Riyadh','Medina','المدينة المنورة'],['jeddah',21.4858,39.1925,'Asia/Riyadh','Jeddah','جدة'],
['dubai',25.2048,55.2708,'Asia/Dubai','Dubai','دبي'],['abudhabi',24.4539,54.3773,'Asia/Dubai','Abu Dhabi','أبوظبي'],
['doha',25.2854,51.531,'Asia/Qatar','Doha','الدوحة'],['kuwait',29.3759,47.9774,'Asia/Kuwait','Kuwait City','مدينة الكويت'],
['manama',26.2285,50.586,'Asia/Bahrain','Manama','المنامة'],['muscat',23.588,58.3829,'Asia/Muscat','Muscat','مسقط'],
['cairo',30.0444,31.2357,'Africa/Cairo','Cairo','القاهرة'],['alexandria',31.2001,29.9187,'Africa/Cairo','Alexandria','الإسكندرية'],
['amman',31.9539,35.9106,'Asia/Amman','Amman','عمّان'],['gaza',31.5017,34.4668,'Asia/Gaza','Gaza','غزة'],
['jerusalem',31.7683,35.2137,'Asia/Jerusalem','Jerusalem','القدس'],['beirut',33.8938,35.5018,'Asia/Beirut','Beirut','بيروت'],
['damascus',33.5138,36.2765,'Asia/Damascus','Damascus','دمشق'],['baghdad',33.3152,44.3661,'Asia/Baghdad','Baghdad','بغداد'],
['sanaa',15.3694,44.191,'Asia/Riyadh','Sanaa','صنعاء'],['khartoum',15.5007,32.5599,'Africa/Khartoum','Khartoum','الخرطوم'],
['casablanca',33.5731,-7.5898,'Africa/Casablanca','Casablanca','الدار البيضاء'],['rabat',34.0209,-6.8416,'Africa/Rabat','Rabat','الرباط'],
['algiers',36.7538,3.0588,'Africa/Algiers','Algiers','الجزائر'],['tunis',36.8065,10.1815,'Africa/Tunis','Tunis','تونس'],
['tripoli',32.8872,13.1913,'Africa/Tripoli','Tripoli','طرابلس'],['istanbul',41.0082,28.9784,'Europe/Istanbul','Istanbul','إسطنبول'],
['ankara',39.9334,32.8597,'Europe/Istanbul','Ankara','أنقرة'],['london',51.5072,-0.1276,'Europe/London','London','لندن'],
['manchester',53.4808,-2.2426,'Europe/London','Manchester','مانشستر'],['paris',48.8566,2.3522,'Europe/Paris','Paris','باريس'],
['berlin',52.52,13.405,'Europe/Berlin','Berlin','برلين'],['madrid',40.4168,-3.7038,'Europe/Madrid','Madrid','مدريد'],
['rome',41.9028,12.4964,'Europe/Rome','Rome','روما'],['moscow',55.7558,37.6173,'Europe/Moscow','Moscow','موسكو'],
['kyiv',50.4501,30.5234,'Europe/Kyiv','Kyiv','كييف'],['tromso',69.6492,18.9553,'Europe/Oslo','Tromsø (polar test)','ترومسو'],
['reykjavik',64.1466,-21.9426,'Atlantic/Reykjavik','Reykjavík','ريكيافيك'],['newyork',40.7128,-74.006,'America/New_York','New York','نيويورك'],
['losangeles',34.0522,-118.2437,'America/Los_Angeles','Los Angeles','لوس أنجلوس'],['chicago',41.8781,-87.6298,'America/Chicago','Chicago','شيكاغو'],
['toronto',43.6532,-79.3832,'America/Toronto','Toronto','تورونتو'],['mexicocity',19.4326,-99.1332,'America/Mexico_City','Mexico City','مكسيكو سيتي'],
['saopaulo',-23.5505,-46.6333,'America/Sao_Paulo','São Paulo','ساو باولو'],['buenosaires',-34.6037,-58.3816,'America/Buenos_Aires','Buenos Aires','بوينس آيرس'],
['karachi',24.8607,67.0011,'Asia/Karachi','Karachi','كراتشي'],['lahore',31.5204,74.3587,'Asia/Karachi','Lahore','لاهور'],
['islamabad',33.6844,73.0479,'Asia/Karachi','Islamabad','إسلام آباد'],['delhi',28.6139,77.209,'Asia/Kolkata','Delhi','دلهي'],
['mumbai',19.076,72.8777,'Asia/Kolkata','Mumbai','مومباي'],['dhaka',23.8103,90.4125,'Asia/Dhaka','Dhaka','دكا'],
['tehran',35.6892,51.389,'Asia/Tehran','Tehran','طهران'],['jakarta',-6.2088,106.8456,'Asia/Jakarta','Jakarta','جاكرتا'],
['kualalumpur',3.139,101.6869,'Asia/Kuala_Lumpur','Kuala Lumpur','كوالالمبور'],['singapore',1.3521,103.8198,'Asia/Singapore','Singapore','سنغافورة'],
['bangkok',13.7563,100.5018,'Asia/Bangkok','Bangkok','بانكوك'],['tokyo',35.6762,139.6503,'Asia/Tokyo','Tokyo','طوكيو'],
['seoul',37.5665,126.978,'Asia/Seoul','Seoul','سيول'],['beijing',39.9042,116.4074,'Asia/Shanghai','Beijing','بكين'],
['sydney',-33.8688,151.2093,'Australia/Sydney','Sydney','سيدني'],['auckland',-36.8509,174.7645,'Pacific/Auckland','Auckland','أوكلاند'],
['capetown',-33.9249,18.4241,'Africa/Johannesburg','Cape Town','كيب تاون'],['nairobi',-1.2921,36.8219,'Africa/Nairobi','Nairobi','نيروبي']
];

/* ---------------- Bundled holiday dataset (community-maintained) ---------------- */
export const HOLIDAYS = {
version: '2026.1', effectiveYears: [2025, 2026, 2027], updatedAt: '2026-01-15T00:00:00Z',
locales: ['en', 'ar'],
countries: [
{ code: 'SA', name: { en: 'Saudi Arabia', ar: 'السعودية' }, holidays: [
  { id:'sa-founding', type:'national', calendar:'gregorian', month:2, day:22, names:{en:'Founding Day', ar:'يوم التأسيس'} },
  { id:'sa-national', type:'national', calendar:'gregorian', month:9, day:23, names:{en:'Saudi National Day', ar:'اليوم الوطني السعودي'} },
  { id:'sa-fitr', type:'religious', calendar:'islamic', month:10, day:1, durationDays:4, observedDates:{'2025':'2025-03-30','2026':'2026-03-20'}, names:{en:'Eid al-Fitr', ar:'عيد الفطر'} },
  { id:'sa-adha', type:'religious', calendar:'islamic', month:12, day:10, durationDays:4, observedDates:{'2025':'2025-06-06','2026':'2026-05-27'}, names:{en:'Eid al-Adha', ar:'عيد الأضحى'} },
  { id:'sa-ramadan', type:'observance', calendar:'islamic', month:9, day:1, names:{en:'Start of Ramadan', ar:'بداية رمضان'} },
  { id:'sa-ashura', type:'observance', calendar:'islamic', month:1, day:10, names:{en:'Ashura', ar:'عاشوراء'} } ] },
{ code: 'AE', name: { en: 'United Arab Emirates', ar: 'الإمارات' }, holidays: [
  { id:'ae-newyear', type:'national', calendar:'gregorian', month:1, day:1, names:{en:'New Year’s Day', ar:'رأس السنة الميلادية'} },
  { id:'ae-commem', type:'observance', calendar:'gregorian', month:12, day:1, names:{en:'Commemoration Day', ar:'يوم الشهيد'} },
  { id:'ae-national', type:'national', calendar:'gregorian', month:12, day:2, durationDays:2, names:{en:'UAE National Day', ar:'اليوم الوطني الإماراتي'} },
  { id:'ae-fitr', type:'religious', calendar:'islamic', month:10, day:1, durationDays:3, observedDates:{'2025':'2025-03-30','2026':'2026-03-20'}, names:{en:'Eid al-Fitr', ar:'عيد الفطر'} },
  { id:'ae-arafat', type:'religious', calendar:'islamic', month:12, day:9, names:{en:'Arafat Day', ar:'يوم عرفة'} },
  { id:'ae-adha', type:'religious', calendar:'islamic', month:12, day:10, durationDays:3, observedDates:{'2025':'2025-06-06','2026':'2026-05-27'}, names:{en:'Eid al-Adha', ar:'عيد الأضحى'} },
  { id:'ae-hijri-new', type:'religious', calendar:'islamic', month:1, day:1, names:{en:'Islamic New Year', ar:'رأس السنة الهجرية'} },
  { id:'ae-mawlid', type:'religious', calendar:'islamic', month:3, day:12, names:{en:'Prophet’s Birthday', ar:'المولد النبوي'} },
  { id:'ae-isra', type:'observance', calendar:'islamic', month:7, day:27, names:{en:'Isra and Mi‘raj', ar:'الإسراء والمعراج'} } ] },
{ code: 'EG', name: { en: 'Egypt', ar: 'مصر' }, holidays: [
  { id:'eg-coptic-xmas', type:'religious', calendar:'gregorian', month:1, day:7, names:{en:'Coptic Christmas', ar:'عيد الميلاد المجيد'} },
  { id:'eg-jan25', type:'national', calendar:'gregorian', month:1, day:25, names:{en:'Revolution & Police Day', ar:'عيد الثورة والشرطة'} },
  { id:'eg-sinai', type:'national', calendar:'gregorian', month:4, day:25, names:{en:'Sinai Liberation Day', ar:'تحرير سيناء'} },
  { id:'eg-labour', type:'national', calendar:'gregorian', month:5, day:1, names:{en:'Labour Day', ar:'عيد العمال'} },
  { id:'eg-jun30', type:'national', calendar:'gregorian', month:6, day:30, names:{en:'June 30 Revolution', ar:'ثورة 30 يونيو'} },
  { id:'eg-jul23', type:'national', calendar:'gregorian', month:7, day:23, names:{en:'Revolution Day 1952', ar:'ثورة 23 يوليو'} },
  { id:'eg-army', type:'national', calendar:'gregorian', month:10, day:6, names:{en:'Armed Forces Day', ar:'عيد القوات المسلحة'} },
  { id:'eg-sham', type:'observance', calendar:'gregorian', rule:'easter', offset:1, names:{en:'Sham en-Nessim', ar:'شم النسيم'} },
  { id:'eg-fitr', type:'religious', calendar:'islamic', month:10, day:1, durationDays:3, names:{en:'Eid al-Fitr', ar:'عيد الفطر'} },
  { id:'eg-adha', type:'religious', calendar:'islamic', month:12, day:10, durationDays:4, names:{en:'Eid al-Adha', ar:'عيد الأضحى'} },
  { id:'eg-hijri-new', type:'religious', calendar:'islamic', month:1, day:1, names:{en:'Islamic New Year', ar:'رأس السنة الهجرية'} },
  { id:'eg-mawlid', type:'religious', calendar:'islamic', month:3, day:12, names:{en:'Prophet’s Birthday', ar:'المولد النبوي'} } ] },
{ code: 'JO', name: { en: 'Jordan', ar: 'الأردن' }, holidays: [
  { id:'jo-labour', type:'national', calendar:'gregorian', month:5, day:1, names:{en:'Labour Day', ar:'عيد العمال'} },
  { id:'jo-indep', type:'national', calendar:'gregorian', month:5, day:25, names:{en:'Independence Day', ar:'عيد الاستقلال'} },
  { id:'jo-xmas', type:'religious', calendar:'gregorian', month:12, day:25, names:{en:'Christmas', ar:'عيد الميلاد'} },
  { id:'jo-fitr', type:'religious', calendar:'islamic', month:10, day:1, durationDays:3, names:{en:'Eid al-Fitr', ar:'عيد الفطر'} },
  { id:'jo-adha', type:'religious', calendar:'islamic', month:12, day:10, durationDays:4, names:{en:'Eid al-Adha', ar:'عيد الأضحى'} },
  { id:'jo-hijri-new', type:'religious', calendar:'islamic', month:1, day:1, names:{en:'Islamic New Year', ar:'رأس السنة الهجرية'} },
  { id:'jo-mawlid', type:'religious', calendar:'islamic', month:3, day:12, names:{en:'Prophet’s Birthday', ar:'المولد النبوي'} } ] },
{ code: 'MA', name: { en: 'Morocco', ar: 'المغرب', fr: 'Maroc' }, holidays: [
  { id:'ma-newyear', type:'national', calendar:'gregorian', month:1, day:1, names:{en:'New Year’s Day', ar:'رأس السنة', fr:'Jour de l’an'} },
  { id:'ma-manifesto', type:'national', calendar:'gregorian', month:1, day:11, names:{en:'Independence Manifesto', ar:'ذكرى تقديم وثيقة الاستقلال', fr:'Manifeste de l’indépendance'} },
  { id:'ma-labour', type:'national', calendar:'gregorian', month:5, day:1, names:{en:'Labour Day', ar:'عيد الشغل', fr:'Fête du travail'} },
  { id:'ma-throne', type:'national', calendar:'gregorian', month:7, day:30, names:{en:'Throne Day', ar:'عيد العرش', fr:'Fête du Trône'} },
  { id:'ma-oued', type:'national', calendar:'gregorian', month:8, day:14, names:{en:'Oued Ed-Dahab Day', ar:'ذكرى استرجاع وادي الذهب', fr:'Allégeance Oued Ed-Dahab'} },
  { id:'ma-rev', type:'national', calendar:'gregorian', month:8, day:20, names:{en:'Revolution of the King and People', ar:'ثورة الملك والشعب', fr:'Révolution du Roi et du Peuple'} },
  { id:'ma-youth', type:'national', calendar:'gregorian', month:8, day:21, names:{en:'Youth Day', ar:'عيد الشباب', fr:'Fête de la Jeunesse'} },
  { id:'ma-march', type:'national', calendar:'gregorian', month:11, day:6, names:{en:'Green March', ar:'ذكرى المسيرة الخضراء', fr:'Marche Verte'} },
  { id:'ma-indep', type:'national', calendar:'gregorian', month:11, day:18, names:{en:'Independence Day', ar:'عيد الاستقلال', fr:'Fête de l’Indépendance'} },
  { id:'ma-fitr', type:'religious', calendar:'islamic', month:10, day:1, durationDays:2, names:{en:'Eid al-Fitr', ar:'عيد الفطر', fr:'Aïd el-Fitr'} },
  { id:'ma-adha', type:'religious', calendar:'islamic', month:12, day:10, durationDays:2, names:{en:'Eid al-Adha', ar:'عيد الأضحى', fr:'Aïd el-Adha'} },
  { id:'ma-hijri-new', type:'religious', calendar:'islamic', month:1, day:1, names:{en:'Islamic New Year', ar:'رأس السنة الهجرية', fr:'Nouvel an hégirien'} },
  { id:'ma-mawlid', type:'religious', calendar:'islamic', month:3, day:12, durationDays:2, names:{en:'Prophet’s Birthday', ar:'عيد المولد النبوي', fr:'Aïd al-Mawlid'} } ] },
{ code: 'TR', name: { en: 'Türkiye', ar: 'تركيا', tr: 'Türkiye' }, holidays: [
  { id:'tr-newyear', type:'national', calendar:'gregorian', month:1, day:1, names:{en:'New Year’s Day', ar:'رأس السنة', tr:'Yılbaşı'} },
  { id:'tr-apr23', type:'national', calendar:'gregorian', month:4, day:23, names:{en:'Sovereignty & Children’s Day', ar:'يوم السيادة والطفل', tr:'Ulusal Egemenlik ve Çocuk Bayramı'} },
  { id:'tr-may1', type:'national', calendar:'gregorian', month:5, day:1, names:{en:'Labour Day', ar:'عيد العمال', tr:'Emek ve Dayanışma Günü'} },
  { id:'tr-may19', type:'national', calendar:'gregorian', month:5, day:19, names:{en:'Youth & Sports Day', ar:'يوم الشباب والرياضة', tr:'Atatürk’ü Anma, Gençlik ve Spor Bayramı'} },
  { id:'tr-jul15', type:'national', calendar:'gregorian', month:7, day:15, names:{en:'Democracy & National Unity Day', ar:'يوم الديمقراطية والوحدة', tr:'Demokrasi ve Millî Birlik Günü'} },
  { id:'tr-aug30', type:'national', calendar:'gregorian', month:8, day:30, names:{en:'Victory Day', ar:'يوم النصر', tr:'Zafer Bayramı'} },
  { id:'tr-oct29', type:'national', calendar:'gregorian', month:10, day:29, names:{en:'Republic Day', ar:'يوم الجمهورية', tr:'Cumhuriyet Bayramı'} },
  { id:'tr-fitr', type:'religious', calendar:'islamic', month:10, day:1, durationDays:3, observedDates:{'2025':'2025-03-30','2026':'2026-03-20'}, names:{en:'Ramadan Feast', ar:'عيد الفطر', tr:'Ramazan Bayramı'} },
  { id:'tr-adha', type:'religious', calendar:'islamic', month:12, day:10, durationDays:4, observedDates:{'2025':'2025-06-06','2026':'2026-05-27'}, names:{en:'Sacrifice Feast', ar:'عيد الأضحى', tr:'Kurban Bayramı'} } ] },
{ code: 'GB', name: { en: 'United Kingdom (England)', ar: 'المملكة المتحدة' }, holidays: [
  { id:'gb-newyear', type:'bank', calendar:'gregorian', month:1, day:1, sub:{sat:2,sun:1}, names:{en:'New Year’s Day', ar:'رأس السنة'} },
  { id:'gb-goodfri', type:'bank', calendar:'gregorian', rule:'easter', offset:-2, names:{en:'Good Friday', ar:'الجمعة العظيمة'} },
  { id:'gb-eastermon', type:'bank', calendar:'gregorian', rule:'easter', offset:1, names:{en:'Easter Monday', ar:'اثنين الفصح'} },
  { id:'gb-may', type:'bank', calendar:'gregorian', rule:'nthDow', month:5, dow:1, n:1, names:{en:'Early May bank holiday', ar:'عطلة أوائل مايو'} },
  { id:'gb-spring', type:'bank', calendar:'gregorian', rule:'lastDow', month:5, dow:1, names:{en:'Spring bank holiday', ar:'عطلة الربيع'} },
  { id:'gb-summer', type:'bank', calendar:'gregorian', rule:'lastDow', month:8, dow:1, names:{en:'Summer bank holiday', ar:'عطلة الصيف'} },
  { id:'gb-xmas', type:'bank', calendar:'gregorian', month:12, day:25, sub:{sat:2,sun:2}, names:{en:'Christmas Day', ar:'عيد الميلاد'} },
  { id:'gb-boxing', type:'bank', calendar:'gregorian', month:12, day:26, sub:{sat:2,sun:2}, names:{en:'Boxing Day', ar:'يوم الصناديق'} } ] },
{ code: 'US', name: { en: 'United States', ar: 'الولايات المتحدة' }, holidays: [
  { id:'us-newyear', type:'national', calendar:'gregorian', month:1, day:1, sub:{sat:-1,sun:1}, names:{en:'New Year’s Day', ar:'رأس السنة'} },
  { id:'us-mlk', type:'national', calendar:'gregorian', rule:'nthDow', month:1, dow:1, n:3, names:{en:'Martin Luther King Jr. Day', ar:'يوم مارتن لوثر كينغ'} },
  { id:'us-pres', type:'national', calendar:'gregorian', rule:'nthDow', month:2, dow:1, n:3, names:{en:'Washington’s Birthday', ar:'عيد ميلاد واشنطن'} },
  { id:'us-memorial', type:'national', calendar:'gregorian', rule:'lastDow', month:5, dow:1, names:{en:'Memorial Day', ar:'يوم الذكرى'} },
  { id:'us-juneteenth', type:'national', calendar:'gregorian', month:6, day:19, sub:{sat:-1,sun:1}, names:{en:'Juneteenth', ar:'جونتينث'} },
  { id:'us-indep', type:'national', calendar:'gregorian', month:7, day:4, sub:{sat:-1,sun:1}, names:{en:'Independence Day', ar:'عيد الاستقلال'} },
  { id:'us-labor', type:'national', calendar:'gregorian', rule:'nthDow', month:9, dow:1, n:1, names:{en:'Labor Day', ar:'عيد العمال'} },
  { id:'us-columbus', type:'national', calendar:'gregorian', rule:'nthDow', month:10, dow:1, n:2, names:{en:'Columbus Day', ar:'يوم كولومبوس'} },
  { id:'us-veterans', type:'national', calendar:'gregorian', month:11, day:11, sub:{sat:-1,sun:1}, names:{en:'Veterans Day', ar:'يوم المحاربين القدامى'} },
  { id:'us-thanks', type:'national', calendar:'gregorian', rule:'nthDow', month:11, dow:4, n:4, names:{en:'Thanksgiving', ar:'عيد الشكر'} },
  { id:'us-xmas', type:'national', calendar:'gregorian', month:12, day:25, sub:{sat:-1,sun:1}, names:{en:'Christmas Day', ar:'عيد الميلاد'} },
  { id:'us-easter', type:'observance', calendar:'gregorian', rule:'easter', offset:0, names:{en:'Easter Sunday', ar:'أحد الفصح'} } ] },
{ code: 'ID', name: { en: 'Indonesia', ar: 'إندونيسيا', id: 'Indonesia' }, holidays: [
  { id:'id-newyear', type:'national', calendar:'gregorian', month:1, day:1, names:{en:'New Year’s Day', ar:'رأس السنة', id:'Tahun Baru Masehi'} },
  { id:'id-pancasila', type:'national', calendar:'gregorian', month:6, day:1, names:{en:'Pancasila Day', ar:'يوم البانكاسيلا', id:'Hari Lahir Pancasila'} },
  { id:'id-indep', type:'national', calendar:'gregorian', month:8, day:17, names:{en:'Independence Day', ar:'عيد الاستقلال', id:'Hari Kemerdekaan'} },
  { id:'id-xmas', type:'religious', calendar:'gregorian', month:12, day:25, names:{en:'Christmas', ar:'عيد الميلاد', id:'Hari Natal'} },
  { id:'id-fitr', type:'religious', calendar:'islamic', month:10, day:1, durationDays:2, names:{en:'Eid al-Fitr', ar:'عيد الفطر', id:'Idulfitri'} },
  { id:'id-adha', type:'religious', calendar:'islamic', month:12, day:10, names:{en:'Eid al-Adha', ar:'عيد الأضحى', id:'Iduladha'} },
  { id:'id-hijri-new', type:'religious', calendar:'islamic', month:1, day:1, names:{en:'Islamic New Year', ar:'رأس السنة الهجرية', id:'Tahun Baru Islam'} },
  { id:'id-mawlid', type:'religious', calendar:'islamic', month:3, day:12, names:{en:'Prophet’s Birthday', ar:'المولد النبوي', id:'Maulid Nabi'} },
  { id:'id-isra', type:'religious', calendar:'islamic', month:7, day:27, names:{en:'Isra and Mi‘raj', ar:'الإسراء والمعراج', id:'Israk Mikraj'} } ] }
]};
export const COUNTRY_CODES = HOLIDAYS.countries.map(c => c.code);

/* ---------------- Defaults & sanitisation ---------------- */
export const DEFAULTS = {
  version: 1,
  language: { app: 'en', direction: 'auto', gregorian: 'en', hijri: 'ar', numbers: 'auto', bilingual: true, secondGreg: 'ar', secondHij: 'en' },
  calendar: { primary: 'gregorian', method: 'islamic-umalqura', adj: 0, weekStart: 'auto', style: 'full', showSecondary: true,
    rollover: { mode: 'sunset', offset: 0, applyTo: 'hijri' } },
  location: { source: 'timezone', city: 'riyadh', latitude: null, longitude: null, timezone: null, label: '' },
  solar: { clock: 'auto', seconds: true, dial: true, altitude: true, shadow: true, objectHeight: null, unit: 'm', winRise: 15, winSet: 15, winNoon: 10, periodNames: {} },
  moon: { showRoll: true, riseSet: true },
  holidays: { countries: ['SA'], religious: true, national: true, observances: false, bank: true, regional: true, estBadge: true },
  theme: { mode: 'auto', intensity: 65, reducedMotion: 'auto', stars: true, moonGlow: true, overlay: true,
    custom: { top: '#0b1e46', horizon: '#ff9a3c', accent: '#e8b64c' } },
  updates: { enabled: false }
};
const ENUMS = {
  'language.app': ['en','ar','fr','tr','ur','id','ms'], 'language.direction': ['auto','ltr','rtl'],
  'language.gregorian': ['en','ar','fr','tr','ur','id','ms'], 'language.hijri': ['en','ar','fr','tr','ur','id','ms'],
  'language.secondGreg': ['en','ar','fr','tr','ur','id','ms'], 'language.secondHij': ['en','ar','fr','tr','ur','id','ms'],
  'language.numbers': ['auto','latn','arab','arabext'],
  'calendar.primary': ['gregorian','hijri'], 'calendar.method': ['islamic-civil','islamic-astronomical','islamic-umalqura','islamic-local'],
  'calendar.weekStart': ['auto','0','1','6'], 'calendar.style': ['full','long','medium'],
  'calendar.rollover.mode': ['midnight','sunset'], 'calendar.rollover.applyTo': ['hijri','both'],
  'location.source': ['timezone','city','manual','geo'],
  'solar.clock': ['auto','12','24'], 'solar.unit': ['m','cm','ft','none'],
  'theme.mode': ['auto','day','night','dynamic','system','custom'], 'theme.reducedMotion': ['auto','reduce','full']
};
const RANGES = { 'calendar.adj': [-3,3], 'calendar.rollover.offset': [0,30], 'location.latitude': [-90,90], 'location.longitude': [-180,180],
  'solar.objectHeight': [0,100000], 'solar.winRise': [0,60], 'solar.winSet': [0,60], 'solar.winNoon': [0,60], 'theme.intensity': [0,100] };
const cleanStr = s => String(s).replace(/[\u0000-\u001f<>]/g, '').slice(0, 120);
export function sanitize(raw) {
  const out = structuredClone(DEFAULTS);
  function walk(def, src, path) {
    if (src == null || typeof src !== 'object') return;
    for (const k of Object.keys(def)) {
      const p = path ? path + '.' + k : k, v = src[k];
      if (v === undefined) continue;
      if (k === 'countries') { if (Array.isArray(v)) out.holidays.countries = v.filter(c => COUNTRY_CODES.includes(c)).slice(0, 9); continue; }
      if (k === 'periodNames') {
        if (v && typeof v === 'object') for (const lang of Object.keys(v)) {
          if (!/^[a-z]{2}$/.test(lang) || typeof v[lang] !== 'object' || !v[lang]) continue;
          const e = {}; for (const pk of ['morning','noon','afternoon']) if (typeof v[lang][pk] === 'string' && v[lang][pk].trim()) e[pk] = cleanStr(v[lang][pk]);
          if (Object.keys(e).length) out.solar.periodNames[lang] = e;
        } continue;
      }
      const dv = def[k];
      if (dv !== null && typeof dv === 'object' && !Array.isArray(dv)) { walk(dv, v, p); continue; }
      if (ENUMS[p]) { if (ENUMS[p].includes(String(v))) setPath(out, p, String(v)); continue; }
      if (RANGES[p]) { const n = Number(v); if (Number.isFinite(n)) setPath(out, p, Math.min(RANGES[p][1], Math.max(RANGES[p][0], n))); else if (v === null) setPath(out, p, null); continue; }
      if (typeof dv === 'boolean') { setPath(out, p, !!v); continue; }
      if (p.startsWith('theme.custom.')) { if (/^#[0-9a-fA-F]{6}$/.test(String(v))) setPath(out, p, String(v)); continue; }
      if (p === 'location.timezone') { if (v === null || v === '') setPath(out, p, null); else if (validTz(String(v))) setPath(out, p, String(v)); continue; }
      if (p === 'location.city') { if (CITIES.some(c => c[0] === v)) setPath(out, p, v); continue; }
      if (typeof dv === 'string' || dv === null) { if (typeof v === 'string') setPath(out, p, cleanStr(v)); continue; }
      if (typeof dv === 'number') { const n = Number(v); if (Number.isFinite(n)) setPath(out, p, n); }
    }
  }
  walk(DEFAULTS, raw, '');
  out.version = 1;
  return out;
}
function setPath(o, p, v) { const ks = p.split('.'); let t = o; for (let i = 0; i < ks.length - 1; i++) t = t[ks[i]]; t[ks[ks.length - 1]] = v; }
export function getPath(o, p) { return p.split('.').reduce((t, k) => (t == null ? t : t[k]), o); }
export function putPath(o, p, v) { setPath(o, p, v); }

/* Location resolution — priority: manual > city > geo > timezone > fallback */
export function resolveLocation(settings, deviceTz) {
  const L = settings.location;
  const tz = L.timezone && validTz(L.timezone) ? L.timezone
    : (L.source === 'city' ? (CITIES.find(c => c[0] === L.city) || [])[3] : null) || deviceTz;
  const tzRow = TZ_TABLE[tz];
  if (L.source === 'manual' && L.latitude != null) {
    const lon = L.longitude != null ? L.longitude : (tzRow ? tzRow[1] : 0);
    return { lat: L.latitude, lon, tz, source: 'manual', approx: false, latOnly: L.longitude == null,
      label: L.label || null };
  }
  if (L.source === 'city') {
    const c = CITIES.find(x => x[0] === L.city) || CITIES[0];
    return { lat: c[1], lon: c[2], tz: L.timezone && validTz(L.timezone) ? L.timezone : c[3], source: 'city', approx: false, city: c };
  }
  if (L.source === 'geo' && L.latitude != null && L.longitude != null)
    return { lat: L.latitude, lon: L.longitude, tz, source: 'geo', approx: false };
  if (tzRow) return { lat: tzRow[0], lon: tzRow[1], tz, source: 'timezone', approx: true, place: tzRow };
  const offH = tzOffsetMs(Date.now(), tz) / 3600000;
  return { lat: 0, lon: Math.max(-180, Math.min(180, offH * 15)), tz, source: 'fallback', approx: true, missing: true };
}
export function countryHint(tz) { const r = TZ_TABLE[tz]; return r && r[4] && COUNTRY_CODES.includes(r[4]) ? r[4] : null; }
export function flagOf(code) { return String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)); }
export function validateHolidayDataset(d) {
  return d && typeof d.version === 'string' && Array.isArray(d.countries) &&
    d.countries.every(c => typeof c.code === 'string' && Array.isArray(c.holidays) &&
      c.holidays.every(h => h.id && h.type && h.calendar && h.names && h.names.en));
}
