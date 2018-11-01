var load_path       = 'locales/el/translation.json?v=1.1';

var i18nextOptions =  {
                        fallbackLng:  'el',
                        useLocalStorage: true , 
                        useDataAttrOptions:true,
                        ns:           [ 'translation'],
                        defaultNS:    [ 'translation'],
                        backend:      {
                                          loadPath: load_path,
                                      },
                        detection:    { 
                                          order: ['cookie', 'navigator'],
                                          lookupCookie: 'i18next',
                                          cookieDomain: 'dev.e-me.edu.gr'
                                      },
                        cache:        {
                                          enabled: false,
                                      },
                        debug:        false,
                        load: 'languageOnly',
                      };

