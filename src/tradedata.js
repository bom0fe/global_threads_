// Country/commodity reference tables and CSV-loading hooks for trade and risk data.
import { useState, useEffect } from "react";

export const KOREA = { name: "South Korea", lat: 37.5665, lng: 126.978 };

export const COUNTRY_GEO = {
  "Afghanistan":                            { code: "AF", lat: 33.9391,   lng: 67.7100,   region: "Asia"           },
  "Albania":                                { code: "AL", lat: 41.1533,   lng: 20.1683,   region: "Europe"         },
  "Algeria":                                { code: "DZ", lat: 28.0339,   lng: 1.6596,    region: "Africa"         },
  "American Samoa":                         { code: "AS", lat: -14.2710,  lng: -170.1322, region: "Oceania"        },
  "Andorra":                                { code: "AD", lat: 42.5063,   lng: 1.5218,    region: "Europe"         },
  "Angola":                                 { code: "AO", lat: -11.2027,  lng: 17.8739,   region: "Africa"         },
  "Antigua and Barbuda":                    { code: "AG", lat: 17.0608,   lng: -61.7964,  region: "Caribbean"      },
  "Argentina":                              { code: "AR", lat: -38.4161,  lng: -63.6167,  region: "South America"  },
  "Armenia":                                { code: "AM", lat: 40.0691,   lng: 45.0382,   region: "Asia"           },
  "Aruba":                                  { code: "AW", lat: 12.5211,   lng: -69.9683,  region: "Caribbean"      },
  "Australia":                              { code: "AU", lat: -25.2744,  lng: 133.7751,  region: "Oceania"        },
  "Austria":                                { code: "AT", lat: 47.5162,   lng: 14.5501,   region: "Europe"         },
  "Azerbaijan":                             { code: "AZ", lat: 40.1431,   lng: 47.5769,   region: "Asia"           },
  "Bahamas":                                { code: "BS", lat: 25.0343,   lng: -77.3963,  region: "Caribbean"      },
  "Bahrain":                                { code: "BH", lat: 26.0667,   lng: 50.5577,   region: "Middle East"    },
  "Bangladesh":                             { code: "BD", lat: 23.6850,   lng: 90.3563,   region: "Asia"           },
  "Belarus":                                { code: "BY", lat: 53.7098,   lng: 27.9534,   region: "Europe"         },
  "Belgium":                                { code: "BE", lat: 50.5039,   lng: 4.4699,    region: "Europe"         },
  "Belize":                                 { code: "BZ", lat: 17.1899,   lng: -88.4976,  region: "Central America" },
  "Bermuda":                                { code: "BM", lat: 32.3078,   lng: -64.7505,  region: "North America"  },
  "Bhutan":                                 { code: "BT", lat: 27.5142,   lng: 90.4336,   region: "Asia"           },
  "Bolivia":                                { code: "BO", lat: -16.2902,  lng: -63.5887,  region: "South America"  },
  "Bosnia and Herzegovina":                 { code: "BA", lat: 43.9159,   lng: 17.6791,   region: "Europe"         },
  "Botswana":                               { code: "BW", lat: -22.3285,  lng: 24.6849,   region: "Africa"         },
  "Brazil":                                 { code: "BR", lat: -14.2350,  lng: -51.9253,  region: "South America"  },
  "Brunei Darussalam":                      { code: "BN", lat: 4.5353,    lng: 114.7277,  region: "Asia"           },
  "Bulgaria":                               { code: "BG", lat: 42.7339,   lng: 25.4858,   region: "Europe"         },
  "Burundi":                                { code: "BI", lat: -3.3731,   lng: 29.9189,   region: "Africa"         },
  "Cambodia":                               { code: "KH", lat: 12.5657,   lng: 104.9910,  region: "Asia"           },
  "Cameroon":                               { code: "CM", lat: 3.8480,    lng: 11.5021,   region: "Africa"         },
  "Canada":                                 { code: "CA", lat: 56.1304,   lng: -106.3468, region: "North America"  },
  "Cayman Islands":                         { code: "KY", lat: 19.3133,   lng: -81.2546,  region: "Caribbean"      },
  "Central African Republic":               { code: "CF", lat: 6.6111,    lng: 20.9394,   region: "Africa"         },
  "Chile":                                  { code: "CL", lat: -35.6751,  lng: -71.5430,  region: "South America"  },
  "China":                                  { code: "CN", lat: 35.8617,   lng: 104.1954,  region: "Asia"           },
  "Colombia":                               { code: "CO", lat: 4.5709,    lng: -74.2973,  region: "South America"  },
  "Congo":                                  { code: "CG", lat: -0.2280,   lng: 15.8277,   region: "Africa"         },
  "Congo  The Democratic Republic Of The":  { code: "CD", lat: -4.0383,   lng: 21.7587,   region: "Africa"         },
  "Costa Rica":                             { code: "CR", lat: 9.7489,    lng: -83.7534,  region: "Central America" },
  "Cote d'Ivoire":                          { code: "CI", lat: 7.5400,    lng: -5.5471,   region: "Africa"         },
  "Croatia":                                { code: "HR", lat: 45.1000,   lng: 15.2000,   region: "Europe"         },
  "Cuba":                                   { code: "CU", lat: 21.5218,   lng: -77.7812,  region: "Caribbean"      },
  "Cyprus":                                 { code: "CY", lat: 35.1264,   lng: 33.4299,   region: "Europe"         },
  "Czech Republic":                         { code: "CZ", lat: 49.8175,   lng: 15.4730,   region: "Europe"         },
  "Denmark":                                { code: "DK", lat: 56.2639,   lng: 9.5018,    region: "Europe"         },
  "Dominican Republic":                     { code: "DO", lat: 18.7357,   lng: -70.1627,  region: "Caribbean"      },
  "Ecuador":                                { code: "EC", lat: -1.8312,   lng: -78.1834,  region: "South America"  },
  "Egypt":                                  { code: "EG", lat: 26.8206,   lng: 30.8025,   region: "Africa"         },
  "El Salvador":                            { code: "SV", lat: 13.7942,   lng: -88.8965,  region: "Central America" },
  "Equatorial Guinea":                      { code: "GQ", lat: 1.6508,    lng: 10.2679,   region: "Africa"         },
  "Eritrea":                                { code: "ER", lat: 15.1794,   lng: 39.7823,   region: "Africa"         },
  "Estonia":                                { code: "EE", lat: 58.5953,   lng: 25.0136,   region: "Europe"         },
  "Ethiopia":                               { code: "ET", lat: 9.1450,    lng: 40.4897,   region: "Africa"         },
  "Fiji":                                   { code: "FJ", lat: -17.7134,  lng: 178.0650,  region: "Oceania"        },
  "Finland":                                { code: "FI", lat: 61.9241,   lng: 25.7482,   region: "Europe"         },
  "France":                                 { code: "FR", lat: 46.2276,   lng: 2.2137,    region: "Europe"         },
  "French Polynesia":                       { code: "PF", lat: -17.6797,  lng: -149.4068, region: "Oceania"        },
  "Gabon":                                  { code: "GA", lat: -0.8037,   lng: 11.6094,   region: "Africa"         },
  "Gambia":                                 { code: "GM", lat: 13.4432,   lng: -15.3101,  region: "Africa"         },
  "Georgia":                                { code: "GE", lat: 42.3154,   lng: 43.3569,   region: "Asia"           },
  "Germany":                                { code: "DE", lat: 51.1657,   lng: 10.4515,   region: "Europe"         },
  "Ghana":                                  { code: "GH", lat: 7.9465,    lng: -1.0232,   region: "Africa"         },
  "Gibraltar":                              { code: "GI", lat: 36.1408,   lng: -5.3536,   region: "Europe"         },
  "Greece":                                 { code: "GR", lat: 39.0742,   lng: 21.8243,   region: "Europe"         },
  "Guam":                                   { code: "GU", lat: 13.4443,   lng: 144.7937,  region: "Oceania"        },
  "Guatemala":                              { code: "GT", lat: 15.7835,   lng: -90.2308,  region: "Central America" },
  "Guinea":                                 { code: "GN", lat: 9.9456,    lng: -11.2874,  region: "Africa"         },
  "Guyana":                                 { code: "GY", lat: 4.8604,    lng: -58.9302,  region: "South America"  },
  "Haiti":                                  { code: "HT", lat: 18.9712,   lng: -72.2852,  region: "Caribbean"      },
  "Honduras":                               { code: "HN", lat: 15.1999,   lng: -86.2419,  region: "Central America" },
  "Hong Kong":                              { code: "HK", lat: 22.3193,   lng: 114.1694,  region: "Asia"           },
  "Hungary":                                { code: "HU", lat: 47.1625,   lng: 19.5033,   region: "Europe"         },
  "Iceland":                                { code: "IS", lat: 64.9631,   lng: -19.0208,  region: "Europe"         },
  "India":                                  { code: "IN", lat: 20.5937,   lng: 78.9629,   region: "Asia"           },
  "Indonesia":                              { code: "ID", lat: -0.7893,   lng: 113.9213,  region: "Asia"           },
  "Iran -Islamic Republic of":              { code: "IR", lat: 32.4279,   lng: 53.6880,   region: "Middle East"    },
  "Iraq":                                   { code: "IQ", lat: 33.2232,   lng: 43.6793,   region: "Middle East"    },
  "Ireland":                                { code: "IE", lat: 53.1424,   lng: -7.6921,   region: "Europe"         },
  "Isle Of Man":                            { code: "IM", lat: 54.2361,   lng: -4.5481,   region: "Europe"         },
  "Israel":                                 { code: "IL", lat: 31.0461,   lng: 34.8516,   region: "Middle East"    },
  "Italy":                                  { code: "IT", lat: 41.8719,   lng: 12.5674,   region: "Europe"         },
  "Jamaica":                                { code: "JM", lat: 18.1096,   lng: -77.2975,  region: "Caribbean"      },
  "Japan":                                  { code: "JP", lat: 36.2048,   lng: 138.2529,  region: "Asia"           },
  "Jordan":                                 { code: "JO", lat: 30.5852,   lng: 36.2384,   region: "Middle East"    },
  "Kazakhstan":                             { code: "KZ", lat: 48.0196,   lng: 66.9237,   region: "Asia"           },
  "Kenya":                                  { code: "KE", lat: -0.0236,   lng: 37.9062,   region: "Africa"         },
  "Kiribati":                               { code: "KI", lat: -3.3704,   lng: -168.7340, region: "Oceania"        },
  "Kuwait":                                 { code: "KW", lat: 29.3117,   lng: 47.4818,   region: "Middle East"    },
  "Kyrgyzstan":                             { code: "KG", lat: 41.2044,   lng: 74.7661,   region: "Asia"           },
  "Lao People's Democratic Republic":       { code: "LA", lat: 19.8563,   lng: 102.4955,  region: "Asia"           },
  "Latvia":                                 { code: "LV", lat: 56.8796,   lng: 24.6032,   region: "Europe"         },
  "Lebanon":                                { code: "LB", lat: 33.8547,   lng: 35.8623,   region: "Middle East"    },
  "Liberia":                                { code: "LR", lat: 6.4281,    lng: -9.4295,   region: "Africa"         },
  "Liechtenstein":                          { code: "LI", lat: 47.1660,   lng: 9.5554,    region: "Europe"         },
  "Lithuania":                              { code: "LT", lat: 55.1694,   lng: 23.8813,   region: "Europe"         },
  "Luxembourg":                             { code: "LU", lat: 49.8153,   lng: 6.1296,    region: "Europe"         },
  "Macao":                                  { code: "MO", lat: 22.1987,   lng: 113.5439,  region: "Asia"           },
  "Macedonia":                              { code: "MK", lat: 41.6086,   lng: 21.7453,   region: "Europe"         },
  "Madagascar":                             { code: "MG", lat: -18.7669,  lng: 46.8691,   region: "Africa"         },
  "Malawi":                                 { code: "MW", lat: -13.2543,  lng: 34.3015,   region: "Africa"         },
  "Malaysia":                               { code: "MY", lat: 4.2105,    lng: 101.9758,  region: "Asia"           },
  "Mali":                                   { code: "ML", lat: 17.5707,   lng: -3.9962,   region: "Africa"         },
  "Malta":                                  { code: "MT", lat: 35.9375,   lng: 14.3754,   region: "Europe"         },
  "Marshall Islands":                       { code: "MH", lat: 7.1315,    lng: 171.1845,  region: "Oceania"        },
  "Mauritania":                             { code: "MR", lat: 21.0079,   lng: -10.9408,  region: "Africa"         },
  "Mauritius":                              { code: "MU", lat: -20.3484,  lng: 57.5522,   region: "Africa"         },
  "Mexico":                                 { code: "MX", lat: 23.6345,   lng: -102.5528, region: "North America"  },
  "Micronesia":                             { code: "FM", lat: 7.4256,    lng: 150.5508,  region: "Oceania"        },
  "Moldova  Republic of":                   { code: "MD", lat: 47.4116,   lng: 28.3699,   region: "Europe"         },
  "Monaco":                                 { code: "MC", lat: 43.7384,   lng: 7.4246,    region: "Europe"         },
  "Mongolia":                               { code: "MN", lat: 46.8625,   lng: 103.8467,  region: "Asia"           },
  "Morocco":                                { code: "MA", lat: 31.7917,   lng: -7.0926,   region: "Africa"         },
  "Mozambique":                             { code: "MZ", lat: -18.6657,  lng: 35.5296,   region: "Africa"         },
  "Myanmar":                                { code: "MM", lat: 21.9162,   lng: 95.9560,   region: "Asia"           },
  "Namibia":                                { code: "NA", lat: -22.9576,  lng: 18.4904,   region: "Africa"         },
  "Nepal":                                  { code: "NP", lat: 28.3949,   lng: 84.1240,   region: "Asia"           },
  "Netherlands":                            { code: "NL", lat: 52.1326,   lng: 5.2913,    region: "Europe"         },
  "New Caledonia":                          { code: "NC", lat: -20.9043,  lng: 165.6180,  region: "Oceania"        },
  "New Zealand":                            { code: "NZ", lat: -40.9006,  lng: 172.8860,  region: "Oceania"        },
  "Nicaragua":                              { code: "NI", lat: 12.8654,   lng: -85.2072,  region: "Central America" },
  "Niger":                                  { code: "NE", lat: 17.6078,   lng: 8.0817,    region: "Africa"         },
  "Nigeria":                                { code: "NG", lat: 9.0820,    lng: 8.6753,    region: "Africa"         },
  "Niue":                                   { code: "NU", lat: -19.0544,  lng: -169.8672, region: "Oceania"        },
  "Northern Mariana Islands":               { code: "MP", lat: 17.3308,   lng: 145.3847,  region: "Oceania"        },
  "Norway":                                 { code: "NO", lat: 60.4720,   lng: 8.4689,    region: "Europe"         },
  "Oman":                                   { code: "OM", lat: 21.5126,   lng: 55.9233,   region: "Middle East"    },
  "Others":                                 { code: "",   lat: 0,         lng: 0,         region: "Other"          },
  "Pakistan":                               { code: "PK", lat: 30.3753,   lng: 69.3451,   region: "Asia"           },
  "Palau":                                  { code: "PW", lat: 7.5150,    lng: 134.5825,  region: "Oceania"        },
  "Panama":                                 { code: "PA", lat: 8.5380,    lng: -80.7821,  region: "Central America" },
  "Papua New Guinea":                       { code: "PG", lat: -6.3150,   lng: 143.9555,  region: "Oceania"        },
  "Paraguay":                               { code: "PY", lat: -23.4425,  lng: -58.4438,  region: "South America"  },
  "Peru":                                   { code: "PE", lat: -9.1900,   lng: -75.0152,  region: "South America"  },
  "Philippines":                            { code: "PH", lat: 12.8797,   lng: 121.7740,  region: "Asia"           },
  "Poland":                                 { code: "PL", lat: 51.9194,   lng: 19.1451,   region: "Europe"         },
  "Portugal":                               { code: "PT", lat: 39.3999,   lng: -8.2245,   region: "Europe"         },
  "Puerto Rico":                            { code: "PR", lat: 18.2208,   lng: -66.5901,  region: "Caribbean"      },
  "Qatar":                                  { code: "QA", lat: 25.3548,   lng: 51.1839,   region: "Middle East"    },
  "Republic of Montenegro":                 { code: "ME", lat: 42.7087,   lng: 19.3744,   region: "Europe"         },
  "Reunion":                                { code: "RE", lat: -21.1151,  lng: 55.5364,   region: "Africa"         },
  "Romania":                                { code: "RO", lat: 45.9432,   lng: 24.9668,   region: "Europe"         },
  "Russian Federation":                     { code: "RU", lat: 61.5240,   lng: 105.3188,  region: "Europe"         },
  "Rwanda":                                 { code: "RW", lat: -1.9403,   lng: 29.8739,   region: "Africa"         },
  "Saint Kitts and Nevis":                  { code: "KN", lat: 17.3578,   lng: -62.7830,  region: "Caribbean"      },
  "Saint Lucia":                            { code: "LC", lat: 13.9094,   lng: -60.9789,  region: "Caribbean"      },
  "Samoa":                                  { code: "WS", lat: -13.7590,  lng: -172.1046, region: "Oceania"        },
  "San Marino":                             { code: "SM", lat: 43.9424,   lng: 12.4578,   region: "Europe"         },
  "Saudi Arabia":                           { code: "SA", lat: 23.8859,   lng: 45.0792,   region: "Middle East"    },
  "Senegal":                                { code: "SN", lat: 14.4974,   lng: -14.4524,  region: "Africa"         },
  "Serbia":                                 { code: "RS", lat: 44.0165,   lng: 21.0059,   region: "Europe"         },
  "Seychelles":                             { code: "SC", lat: -4.6796,   lng: 55.4920,   region: "Africa"         },
  "Sierra Leone":                           { code: "SL", lat: 8.4606,    lng: -11.7799,  region: "Africa"         },
  "Singapore":                              { code: "SG", lat: 1.3521,    lng: 103.8198,  region: "Asia"           },
  "Slovakia":                               { code: "SK", lat: 48.6690,   lng: 19.6990,   region: "Europe"         },
  "Slovenia":                               { code: "SI", lat: 46.1512,   lng: 14.9955,   region: "Europe"         },
  "Solomon Islands":                        { code: "SB", lat: -9.6457,   lng: 160.1562,  region: "Oceania"        },
  "Somalia":                                { code: "SO", lat: 5.1521,    lng: 46.1996,   region: "Africa"         },
  "South Africa":                           { code: "ZA", lat: -30.5595,  lng: 22.9375,   region: "Africa"         },
  "Spain":                                  { code: "ES", lat: 40.4637,   lng: -3.7492,   region: "Europe"         },
  "Srilanka":                               { code: "LK", lat: 7.8731,    lng: 80.7718,   region: "Asia"           },
  "State of Libya":                         { code: "LY", lat: 26.3351,   lng: 17.2283,   region: "Africa"         },
  "Sudan":                                  { code: "SD", lat: 12.8628,   lng: 30.2176,   region: "Africa"         },
  "Suriname":                               { code: "SR", lat: 3.9193,    lng: -56.0278,  region: "South America"  },
  "Swaziland":                              { code: "SZ", lat: -26.5225,  lng: 31.4659,   region: "Africa"         },
  "Sweden":                                 { code: "SE", lat: 60.1282,   lng: 18.6435,   region: "Europe"         },
  "Switzerland":                            { code: "CH", lat: 46.8182,   lng: 8.2275,    region: "Europe"         },
  "Syrian Arab Republic":                   { code: "SY", lat: 34.8021,   lng: 38.9968,   region: "Middle East"    },
  "Taiwan  Province of China":              { code: "TW", lat: 23.6978,   lng: 120.9605,  region: "Asia"           },
  "Tanzania United Republic of":            { code: "TZ", lat: -6.3690,   lng: 34.8888,   region: "Africa"         },
  "Thailand":                               { code: "TH", lat: 15.8700,   lng: 100.9925,  region: "Asia"           },
  "Timor Leste":                            { code: "TL", lat: -8.8742,   lng: 125.7275,  region: "Asia"           },
  "Togo":                                   { code: "TG", lat: 8.6195,    lng: 0.8248,    region: "Africa"         },
  "Tokelau":                                { code: "TK", lat: -9.2000,   lng: -171.8484, region: "Oceania"        },
  "Trinidad And Tobago":                    { code: "TT", lat: 10.6918,   lng: -61.2225,  region: "Caribbean"      },
  "Tunisia":                                { code: "TN", lat: 33.8869,   lng: 9.5375,    region: "Africa"         },
  "Turkiye":                                { code: "TR", lat: 38.9637,   lng: 35.2433,   region: "Middle East"    },
  "Uganda":                                 { code: "UG", lat: 1.3733,    lng: 32.2903,   region: "Africa"         },
  "Ukraine":                                { code: "UA", lat: 48.3794,   lng: 31.1656,   region: "Europe"         },
  "United Arab Emirates":                   { code: "AE", lat: 23.4241,   lng: 53.8478,   region: "Middle East"    },
  "United Kingdom":                         { code: "GB", lat: 55.3781,   lng: -3.4360,   region: "Europe"         },
  "United States":                          { code: "US", lat: 37.0902,   lng: -95.7129,  region: "North America"  },
  "Uruguay":                                { code: "UY", lat: -32.5228,  lng: -55.7658,  region: "South America"  },
  "Uzbekistan":                             { code: "UZ", lat: 41.3775,   lng: 64.5853,   region: "Asia"           },
  "Venezuela":                              { code: "VE", lat: 6.4238,    lng: -66.5897,  region: "South America"  },
  "Viet nam":                               { code: "VN", lat: 14.0583,   lng: 108.2772,  region: "Asia"           },
  "Yemen":                                  { code: "YE", lat: 15.5527,   lng: 48.5164,   region: "Middle East"    },
  "Zambia":                                 { code: "ZM", lat: -13.1339,  lng: 27.8493,   region: "Africa"         },
  "Zimbabwe":                               { code: "ZW", lat: -19.0154,  lng: 29.1549,   region: "Africa"         },
};

export const HS_CHAPTER_TO_COMMODITY = {
  "10": "Cereals",        
  "11": "milling_industry",        
  "09": "agri",         
  "17": "sugar",         
  "26": "minerals",     
  "27": "energy",       
  "72": "steel",        
  "76": "aluminium",       
  "31": "Fertilisers",      
  "84": "nuclear",    
  "39": "chemicals",    
  "93": "Arms and ammunition",    
  "44": "wood",       
  
  
  
  
  
  
  
  
};

export const COMMODITIES = [
  { id: "energy",     name: "Mineral fuels, mineral oils and products of their distillation", hs: "27", accent: "#8b4300" },
  { id: "sugar",name: "Sugars and sugar confectionery",           hs: "17", accent: "#ffffff" },
  { id: "nuclear",       name: "Machinery",              hs: "84", accent: "#0008ff" },
  { id: "steel",      name: "Steel & Iron",          hs: "72", accent: "#0091ff" },
  { id: "chemicals",  name: "Plastics",    hs: "39", accent: "#00eeff" },
  { id: "Fertilisers",     name: "Fertilisers",       hs: "31", accent: "#00a339" },
  { id: "wood",  name: "Wood and articles of wood", hs: "44", accent: "#ff00e1" },
  { id: "Arms and ammunition",       name: "Arms and ammunition",       hs: "93", accent: "#ff0048" },
  { id: "minerals",   name: "Ores, slag and ash",       hs: "26", accent: "#ffd43b" },
  { id: "aluminium",     name: "Aluminium and articles thereof",    hs: "76", accent: "#80c8ff" },
  { id: "Cereals",      name: "Cereals",       hs: "10", accent: "#a9e34b" },
  { id: "agri",       name: "Coffee, tea, mate and spices",           hs: "09", accent: "#ff8000" },
  { id: "milling_industry",    name: "Products of the milling industry; malt; starches; inulin; wheat gluten",     hs: "11", accent: "#845ef7" },
  
];

// Parses CSV text into an array of header-keyed row objects.
function parseCSV(text) {
  const lines  = text.trim().split("\n");
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseCSVLine(lines[i]);
    const row  = {};
    headers.forEach((h, idx) => { row[h.trim()] = (vals[idx] ?? "").trim(); });
    rows.push(row);
  }
  return rows;
}

// Single CSV line parser that respects quoted fields and escaped quotes.
function parseCSVLine(line) {
  const result = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (ch === "," && !inQ) {
      result.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}


// Split "YYYY-MM" into numeric year/month.
function parsePeriod(period) {
  const [yearStr, monthStr] = period.split("-");
  return { year: parseInt(yearStr, 10), month: parseInt(monthStr, 10) };
}

// Map an HS code to its commodity bucket using the chapter prefix.
function hsToCommodityId(hsCode) {
  const chapter = String(hsCode).padStart(2, "0").slice(0, 2);
  return HS_CHAPTER_TO_COMMODITY[chapter] ?? "other";
}

// Resolve a country name to its geo record.
function getCountryGeo(name) {
  return COUNTRY_GEO[name] ?? null;
}

// Aggregates raw CSV rows into deduped (year, month, country, commodity, direction) records.
export function buildTradeData(csvRows) {
  const countryMap = {};
  const recordsRaw = [];
  csvRows.forEach((row) => {
    const countryName = row["Country"]?.trim();
    const hsCode      = row["HS_Code"]?.trim();
    const periodStr   = row["Period"]?.trim();
    const weightStr   = row["Import_Weight"]?.trim();
    if (!countryName || !hsCode || !periodStr) return;
    const weight = parseFloat(weightStr) || 0;
    if (weight === 0) return;
    const { year, month } = parsePeriod(periodStr);
    const commodityId     = hsToCommodityId(hsCode);
    const geo             = getCountryGeo(countryName);
    if (!geo) return;
    // Stable id derived from the country name.
    const countryId = countryName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!countryMap[countryId]) {
      countryMap[countryId] = { id: countryId, name: countryName, ...geo };
    }
    recordsRaw.push({
      year,
      month,
      countryId,
      commodityId,
      direction: "import",
      value: weight,
      hsCode: String(hsCode),
    });
  });
  // Sum values that share the same key so each bucket appears once.
  const aggMap = {};
  recordsRaw.forEach((r) => {
    const key = `${r.year}_${r.month}_${r.countryId}_${r.commodityId}_${r.direction}`;
    if (!aggMap[key]) {
      aggMap[key] = { ...r, value: 0 };
    }
    aggMap[key].value += r.value;
  });
  const records   = Object.values(aggMap).map((r) => ({ ...r, value: +r.value.toFixed(0) }));
  const countries = Object.values(countryMap);
  return { records, countries };
}

// Restrict records to a year or a (year, month) pair depending on mode.
export function filterByPeriod(records, { year, month, mode }) {
  if (mode === "yearly") return records.filter((r) => r.year === year);
  return records.filter((r) => r.year === year && r.month === month);
}

// Sum trade value per country.
export function totalByCountry(records) {
  const map = {};
  records.forEach(({ countryId, value }) => {
    map[countryId] = (map[countryId] || 0) + value;
  });
  return map;
}

// Sum trade value per commodity, split by direction.
export function totalByCommodity(records) {
  const map = {};
  records.forEach(({ commodityId, direction, value }) => {
    if (!map[commodityId]) map[commodityId] = { export: 0, import: 0 };
    map[commodityId][direction] = +(map[commodityId][direction] + value).toFixed(0);
  });
  return map;
}

// Hook that fetches the trade CSV and exposes records + country list.
export function useTradeData(csvPath = "/data/global_threads_timeseries.csv") {
  const [state, setState] = useState({
    records:   [],
    countries: [],
    loading:   true,
    error:     null,
  });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(csvPath)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status} ${res.statusText}`);
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        const rows = parseCSV(text);
        const { records, countries } = buildTradeData(rows);
        setState({ records, countries, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ records: [], countries: [], loading: false, error: err.message });
      });
    return () => { cancelled = true; };
  }, [csvPath]);

  return state;
}

// Normalizes the per-(country, HS) risk CSV into structured records.
export function buildRiskData(csvRows) {
  return csvRows
    .map((row) => {
      const countryName = row["Country"]?.trim();
      const hsCode      = row["HS_Code"]?.trim();
      const riskScore   = parseFloat(row["Risk_Score"]) || 0;
      const dropRaw     = row["Drop_Months"]?.trim() ?? "";
      if (!countryName || !hsCode) return null;
      const countryId   = countryName.toLowerCase()
        .replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      const commodityId = HS_CHAPTER_TO_COMMODITY?.[
        String(hsCode).padStart(2, "0").slice(0, 2)
      ] ?? "other";
      const dropMonths  = dropRaw
        ? dropRaw.split(";").map((s) => s.trim()).filter(Boolean)
        : [];
      return { countryId, countryName, hsCode, commodityId, riskScore, dropMonths };
    })
    .filter(Boolean);
}

// Highest risk score observed for each country.
export function maxRiskByCountry(riskData) {
  const map = {};
  riskData.forEach(({ countryId, riskScore }) => {
    map[countryId] = Math.max(map[countryId] ?? 0, riskScore);
  });
  return map;
}

// Union of disrupted months reported for each country.
export function dropMonthsByCountry(riskData) {
  const map = {};
  riskData.forEach(({ countryId, dropMonths }) => {
    if (!map[countryId]) map[countryId] = new Set();
    dropMonths.forEach((m) => map[countryId].add(m));
  });
  return map;
}

// Hook that fetches the risk CSV and exposes derived per-country lookups.
export function useRiskData(csvPath = "/data/global_threads_risk.csv") {
  const [state, setState] = useState({
    riskData:       [],
    riskByCountry:  {},
    dropByCountry:  {},
    loading:        true,
    error:          null,
  });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(csvPath)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        const rows        = parseCSV(text);
        const riskData    = buildRiskData(rows);
        const riskByCountry = maxRiskByCountry(riskData);
        const dropByCountry = dropMonthsByCountry(riskData);
        setState({ riskData, riskByCountry, dropByCountry, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ riskData: [], riskByCountry: {}, dropByCountry: {}, loading: false, error: err.message });
      });
    return () => { cancelled = true; };
  }, [csvPath]);

  return state;
}

