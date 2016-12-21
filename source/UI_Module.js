define([
    'jquery', 'HTML_Template', 'Node_Template'
],  function ($, HTML_Template, Node_Template) {

    function UI_Module(iLink) {
        this.ownerApp = iLink.ownerApp;
        this.source = iLink;

        this.$_View = iLink.getTarget();

        this.type = (this.$_View[0] == this.ownerApp.$_Root[0])  ?
            'page'  :  'module';
        this.name = this.$_View[0].getAttribute('name');

        if (! this.name) {
            this.name = $.uuid('EWA');
            this.$_View[0].setAttribute('name', this.name);
        }

        this.template = new HTML_Template(
            this.$_View,  this.getScope(),  iLink.getURL('href')
        );
        this.template.scope.extend( this.getEnv() );

        this.attach();

        this.lastLoad = 0;

        if (this.type == 'page')  this.ownerApp.register( this );
    }

    var Link_Key = $.makeSet('href', 'src');

    $.extend(UI_Module, {
        getClass:      $.CommonView.getClass,
        instanceOf:    $.CommonView.instanceOf,
        reload:        function (iTemplate) {
            for (var i = 0, iModule;  iTemplate[i];  i++)
                if (
                    (iTemplate[i] instanceof Node_Template)  &&
                    (iTemplate[i].ownerNode.nodeName in Link_Key)
                ) {
                    iModule = this.instanceOf(iTemplate[i].ownerElement, true);

                    if (! iModule)  continue;

                    iModule.loadJSON().then(function () {

                        iModule.lastLoad = iModule.template.lastRender = 0;

                        iModule.render( arguments[0] );
                    });
                }
        }
    });

    $.extend(UI_Module.prototype, {
        toString:      $.CommonView.prototype.toString,
        trigger:       function () {
            return this.ownerApp.trigger(
                arguments[0],
                this.source.href || '',
                this.source.src || this.source.action || '',
                [ this.source ].concat( arguments[1] )
            ).slice(-1)[0];
        },
        detach:        function () {
            this.$_Content = this.$_View.children().detach();

            return this;
        },
        attach:        function () {
            this.$_View
                .data(this.constructor.getClass(), this)
                .data(HTML_Template.getClass(), this.template);

            if (this.$_Content) {
                this.$_View.append( this.$_Content );
                this.trigger('ready');
            } else if (this.lastLoad)
                this.load();

            return this;
        },
        getScope:      function () {
            return  (HTML_Template.instanceOf( this.source.$_DOM ) || '').scope;
        },
        getEnv:        function () {
            var iData = { },
                iHTML = this.source.getURL('href'),
                iJSON = this.source.getURL('src') || this.source.getURL('action');

            if (iHTML) {
                var iFileName = $.fileName(iHTML).split('.');

                $.extend(iData, {
                    _File_Path_:    $.filePath(iHTML),
                    _File_Name_:    iFileName[0],
                    _File_Ext_:     iFileName[1]
                });
            }

            if (iJSON) {
                iJSON = iJSON.slice( this.ownerApp.apiPath.length );

                $.extend(iData, {
                    _Data_Path_:    $.filePath(iJSON),
                    _Data_Name_:    $.fileName(iJSON)
                });
            }

            return  $.extend(iData, $.paramJSON(this.source.href));
        },
        prefetch:      function () {
            var InnerLink = this.source.constructor;

            var $_Link = this.$_View.find( InnerLink.selector ).not('link, form');

            for (var i = 0;  $_Link[i] && (i < 5);  i++)
                (new InnerLink(this.ownerApp, $_Link[i])).prefetch();

            return this;
        },
        loadModule:    function () {
            var _This_ = this,  InnerLink = this.source.constructor;

            var $_Module = this.$_View
                    .find('*[href]:not(a, link), *[src]:not(:media, script)')
                    .not( InnerLink.selector );

            return Promise.all($.map(
                $_Module[this.lastLoad ? 'not' : 'filter'](function () {

                //  About this --- https://github.com/jquery/jquery/issues/3270

                    return  (this.getAttribute('async') == 'false');
                }),
                function () {
                    return  (new UI_Module(
                        new InnerLink(_This_.ownerApp, arguments[0])
                    )).load();
                }
            ));
        },
        loadJSON:      function () {
            var _This_ = this;

            return (
                (this.source.getURL('src') || this.source.getURL('action'))  ?
                    this.source.loadData( this.template.scope )  :
                    Promise.resolve('')
            ).then(function (iData) {

                iData = _This_.trigger('data', [iData])  ||  iData;

                if (iData instanceof Array) {
                    var _Data_ = { };
                    _Data_[_This_.name] = iData;
                }

                return  _Data_ || iData;
            });
        },
        loadHTML:      function () {
            var _This_ = this;

            return  this.template.load().then(function () {

                _This_.trigger('template');

                _This_.template.parse();

                var $_Link = _This_.$_View.children('link[target="_blank"]');

                if (! $_Link.remove()[0])  return;

                _This_.template.render();
                _This_.template.lastRender = 0;

                var iLink = _This_.source;

                var iJSON = iLink.src || iLink.action;

                HTML_Template.extend(iLink.$_DOM[0], $_Link[0]);

                _This_.template.scope.extend( _This_.getEnv() );

                if (_This_.type == 'page')
                    iLink.register(iLink.ownerApp.length - 1);

                if ((! iJSON)  &&  (iLink.src || iLink.action))
                    return _This_.loadJSON();
            });
        },
        render:        function () {
            this.template.render( arguments[0] );

            this.lastLoad = $.now();
            this.domReady = null;

            this.prefetch().trigger('ready');

            return this.loadModule();
        },
        load:          function () {
            this.lastLoad = this.template.lastRender = 0;

            var _This_ = this;

            return  this.domReady = Promise.all([
                this.loadJSON(),  this.loadHTML()
            ]).then(function (_Data_) {
                _Data_ = _Data_[0] || _Data_[1];

                if (! _This_.$_View.find('[href][async="false"]')[0])
                    return _Data_;

                _This_.template.render(_Data_);
                _This_.template.lastRender = 0;

                return  _This_.loadModule().then(function () {
                    return _Data_;
                });
            }).then(function (_Data_) {

                return  _This_.$_View.children('script')[0] ?
                    _Data_ : _This_.render(_Data_);
            });
        }
    });

    return UI_Module;

});
