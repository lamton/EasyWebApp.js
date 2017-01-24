define(['jquery', 'HTML_Template'],  function ($, HTML_Template) {

    var BOM = self,  DOM = self.document;

    function InnerLink(iApp, iLink) {
        this.ownerApp = iApp;

        this.$_DOM = $(iLink);

        this.title = iLink.title;
        this.target = iLink.getAttribute('target');
        this.href = iLink.getAttribute('href');
        this.method = (iLink.getAttribute('method') || 'GET').toLowerCase();
        this.src = iLink.getAttribute('src');
        this.action = iLink.getAttribute('action');
    }

    $.extend(InnerLink, {
        selector:       '*[target]:not(a)',
        prefetchRel:    $.browser.modern ? 'prefetch' : 'next'
    });

    var $_Prefetch = $('<link rel="' + InnerLink.prefetchRel + '" />')
            .on('load error',  function () {
                $(this).remove();
            }),
        localStorage = {
            setItem:    function (iName, iData) {
                var iLast = 0,  iKey;

                do  try {
                    BOM.localStorage[ iName ] = JSON.stringify( iData );
                    break;
                } catch (iError) {
                    iKey = BOM.localStorage.key(iLast) || '';

                    if (iKey.match( /^(GET|POST|PUT|DELETE) (\w+:)?\/\/.+/ ))
                        delete  BOM.localStorage[ iKey ];
                    else
                        iLast++ ;
                } while (iLast < BOM.localStorage.length);

                return iData;
            },
            getItem:    function () {
                return  JSON.parse(BOM.localStorage[ arguments[0] ]);
            }
        };

    $.extend(InnerLink.prototype, {
        getScope:      function () {
            return  (HTML_Template.instanceOf( this.$_DOM ) || '').scope;
        },
        getTarget:    function () {
            switch (this.target) {
                case '_self':      return this.ownerApp.$_Root;
                case '_blank':     ;
                case '_parent':    ;
                case '_top':       return $();
            }

            return  this.target  ?
                $('*[name="' + this.target + '"]')  :  this.$_DOM;
        },
        getArgs:      function () {
            var iArgs = { },  iTemplate = HTML_Template.instanceOf( this.$_DOM );

            if ( iTemplate )
                iArgs = iTemplate.contextOf(this.src ? 'src' : 'action');

            return  $.extend(iArgs, this.$_DOM[0].dataset);
        },
        register:     function (Index) {
            DOM.title = this.title || DOM.title;

            BOM.history[this.ownerApp[Index] ? 'replaceState' : 'pushState'](
                {index: Index},
                DOM.title,
                '#!'  +  $.extendURL(this.href, this.getArgs())
            );

            return this;
        },
        getURL:       function (iName) {
            var iURL = this[iName] =
                    this.$_DOM[0].getAttribute(iName) || this[iName];

            if ( iURL ) {
                if ((iName != 'href')  &&  (! $.urlDomain(iURL || ' ')))
                    iURL = this.ownerApp.apiPath + iURL;

                return iURL;
            }
        },
        loadHTML:     function () {
            var iHTML = this.getURL('href'),  $_Target = this.getTarget();

            return  (! iHTML)  ?  Promise.resolve('')  :  Promise.resolve(
                $.ajax(iHTML,  {dataType: 'html'})
            ).then(
                $.proxy($.fn.toggleAnimate, $_Target, 'active')
            ).then(function () {

                var $_Prev = $_Target.children().detach();

                return  $_Target.htmlExec( arguments[0] ).then(function () {

                    return  $_Target.toggleAnimate('active', $_Prev);
                });
            });
        },
        loadJSON:     function () {
            var iJSON = this.getURL('src') || this.getURL('action');

            if (! iJSON)  return Promise.resolve('');

            var iOption = {type:  this.method};

            if (this.$_DOM[0].tagName != 'FORM')
                iOption.data = $.extend({ }, this.$_DOM[0].dataset);
            else if (! this.$_DOM.find('input[type="file"]')[0])
                iOption.data = this.$_DOM.serialize();
            else {
                iOption.data = new BOM.FormData( this.$_DOM[0] );
                iOption.contentType = iOption.processData = false;
            }

            var URI = this.method.toUpperCase() + ' ' + iJSON;

            return  Promise.resolve($.ajax(iJSON, iOption)).then(
                $.proxy(localStorage.setItem, null, URI),
                $.proxy(localStorage.getItem, null, URI)
            );
        },
        load:         function () {
            return  Promise.all([this.loadHTML(), this.loadJSON()]);
        },
        prefetch:     function () {
            var iHTML = (this.href || '').split('?')[0];

            if (iHTML)
                $_Prefetch.clone(true).attr('href', iHTML).appendTo('head');

            if (
                (this.method == 'get')  &&
                this.src  &&  (this.src.indexOf('?') == -1)  &&
                $.isEmptyObject( this.$_DOM[0].dataset )
            )
                $_Prefetch.clone(true).attr(
                    'href',  this.getURL('src') || this.getURL('action')
                ).appendTo('head');
        }
    });

    return InnerLink;

});
