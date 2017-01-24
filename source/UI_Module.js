define([
    'jquery', 'HTML_Template', 'Node_Template', 'InnerLink'
],  function ($, HTML_Template, Node_Template, InnerLink) {

    function UI_Module(iLink, iScope) {

        var iView = $.CommonView.call(this, iLink.getTarget());

        iView.source = iLink;

        if (iView !== this)  return iView;

        this.ownerApp = iLink.ownerApp;

        this.type = (this.$_View[0] == this.ownerApp.$_Root[0])  ?
            'page'  :  'module';
        this.async = (this.$_View[0].getAttribute('async') != 'false');

        this.name = this.$_View[0].getAttribute('name');

        if (! this.name) {
            this.name = $.uuid('EWA');
            this.$_View[0].setAttribute('name', this.name);
        }
        (
            this.template = new HTML_Template(
                this.$_View,  iScope || this.source.getScope()
            )
        ).scope.extend( this.getEnv() );

        this.length = this.lastLoad = 0;
    }

    var Link_Key = $.makeSet('href', 'src');

    return  $.inherit($.CommonView, UI_Module, {
        reload:      function (iTemplate) {
            for (var i = 0, iModule;  iTemplate[i];  i++)
                if (
                    (iTemplate[i] instanceof Node_Template)  &&
                    (iTemplate[i].ownerNode.nodeName in Link_Key)
                ) {
                    iModule = this.instanceOf(iTemplate[i].ownerElement, true);

                    if (! iModule)  continue;

                    iModule.source.loadJSON().then(function () {

                        iModule.load( arguments[0] );
                    });
                }
        },
        selector:    '*[href]:not(a, link), *[src]:not(:media, script)'
    }, {
        emit:          function () {
            var iArgs = [
                    arguments[0],
                    this.source.href || '',
                    this.source.src || this.source.action || '',
                    [ this.source ].concat( arguments[1] )
                ];

            return  this.trigger.apply(this, iArgs).concat(
                this.trigger.apply(this.ownerApp, iArgs)
            )[0];
        },
        attach:        function () {
            this.$_View
                .data(this.constructor.getClass(), this)
                .data(HTML_Template.getClass(), this.template);

            if ( this.$_Content ) {
                this.$_View.append( this.$_Content );

                this.emit('ready');
            }

            return this;
        },
        detach:        function () {
            this.$_Content = arguments[0] || this.$_View.children().detach();

            this.$_View
                .data(this.constructor.getClass(), null)
                .data(HTML_Template.getClass(), null);

            return this;
        },
        destructor:    function () {
            if ( this.$_Content ) {
                this.$_Content.remove();
                this.$_Content = null;
            }
        },
        findSub:       function () {
            var $_Sub = this.$_View.find( UI_Module.selector )
                    .not( InnerLink.selector );

            $_Sub = $($.map($_Sub,  function (_This_, Index) {

                if (! (Index  &&  $.contains($_Sub[Index - 1], _This_)))
                    return _This_;
            }));

            var _This_ = this;

            $.extend(this,  $.map($_Sub,  function () {
                return  new UI_Module(
                    new InnerLink(_This_.ownerApp, arguments[0])
                );
            }));
            this.length = $_Sub.length;

            return $_Sub;
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
        syncLoad:      function ($_Link) {
            this.template.parsePlain( $_Link[0] );
            this.template.renderDOM( $_Link[0] );

            $_Link = $_Link[0].attributes;

            var iLink = this.source;

            for (var i = 0;  $_Link[i];  i++)
                if ($_Link[i].nodeName != 'target')
                    iLink.$_DOM[0].setAttribute(
                        $_Link[i].nodeName,  $_Link[i].nodeValue
                    );

            var iJSON = iLink.src || iLink.action;

            this.template.scope.extend( this.getEnv() );

            if (this.type == 'page') {
                iLink.$_DOM = [
                    $( $_Link[0].ownerElement ),  $_Link = iLink.$_DOM
                ][0];

                iLink.register(this.ownerApp.length - 1).$_DOM.remove();

                iLink.$_DOM = $_Link;
            }

            return  ((! iJSON)  &&  iLink.src)  ?
                this.source.loadJSON()  :  Promise.resolve('');
        },
        loadModule:    function (iScope) {
            var _This_ = this;

            return  Promise.all($.map(this,  function (iModule) {
                if (
                    (_This_.lastLoad && iModule.async)  ||
                    !(_This_.lastLoad || iModule.async)
                ) {
                    if (! iModule.async) {
                        _This_.template.parsePlain( iModule.$_View[0] );
                        _This_.template.renderDOM(iModule.$_View[0], iScope);
                    }

                    return  iModule.source.load().then(function () {

                        iModule.template.parseSlot( arguments[0][0] );

                        return  iModule.load( arguments[0][1] );
                    });
                }
            })).then(function () {  return iScope;  });
        },
        prefetch:      function () {
            var $_Link = this.$_View.find( InnerLink.selector ).not('link, form');

            for (var i = 0;  $_Link[i] && (i < 5);  i++)
                (new InnerLink(this.ownerApp, $_Link[i])).prefetch();

            return this;
        },
        render:        function () {
            this.template.parse( this.$_Sub );
            delete this.$_Sub;

            this.template.render( arguments[0] );

            for (var i = 0;  this[i];  i++)  if (! this[i].async) {

                this[i].template.lastRender = 0;
                this[i].render();
            }

            if (! this.lastLoad)  this.prefetch();

            this.lastLoad = $.now();
            this.domReady = null;

            this.emit('ready');

            return this.loadModule();
        },
        load:          function (iData) {
            this.lastLoad = this.template.lastRender = 0;

            this.emit('template');

            this.$_Sub = this.findSub();

            var $_Link = this.$_View.children('link[target="_blank"]'),
                _This_ = this;

            return  this.domReady = (
                $_Link[0]  ?  this.syncLoad( $_Link )  :  Promise.resolve('')
            ).then(function (_Data_) {

                iData = _Data_ || iData;

                iData = _This_.emit('data', [iData])  ||  iData;

                if (iData instanceof Array) {
                    _Data_ = { };
                    _Data_[_This_.name] = iData;
                }

                return  _Data_ || iData;

            }).then($.proxy(this.loadModule, this)).then(function (_Data_) {

                return  _This_.$_View.children('script')[0] ?
                    _Data_ : _This_.render(_Data_);
            });
        }
    });
});
