var EWA_Polyfill = [
        {exports: 'MutationObserver'},
        {
            exports:    'history.pushState',
            name:       'html5-history-api'
        }
    ].map(function (API) {

        if (! eval('self.' + API.exports))  return  API.name || API.exports;

    }).filter(function () {  return arguments[0];  });


define('Observer',['jquery', 'jQueryKit'],  function ($) {

    function Observer($_View) {

        this.$_View = ($_View instanceof $)  ?  $_View  :  $( $_View );

        var _This_ = this.$_View.data('[object Observer]');

        if ((_This_ != null)  &&  (_This_ != this))  return _This_;

        this.$_View.data('[object Observer]', this);

        this.__handle__ = { };

        return this;
    }

    $.extend(Observer, {
        getEvent:    function (iEvent) {
            return $.extend(
                { },
                (typeof iEvent == 'string')  ?  {type: iEvent}  :  iEvent,
                arguments[1]
            );
        },
        match:       function (iEvent, iHandle) {
            var iRegExp;

            for (var iKey in iHandle) {

                iRegExp = iEvent[iKey] instanceof RegExp;

                switch ($.Type( iHandle[iKey] )) {
                    case 'RegExp':
                        if ( iRegExp ) {
                            if (iEvent[iKey].toString() != iHandle[iKey].toString())
                                return;
                            break;
                        }
                    case 'String':    {
                        if (! (iEvent[iKey] || '')[iRegExp ? 'test' : 'match'](
                            iHandle[iKey]
                        ))
                            return;
                        break;
                    }
                    case 'Function':
                        if (typeof iEvent[iKey] != 'function')  break;
                    default:
                        if (iEvent[iKey] !== iHandle[iKey])  return;
                }
            }

            return iHandle;
        },
        getClass:        function () {

            return this.prototype.toString.call(
                {constructor: this}
            ).split(' ')[1].slice(0, -1);
        }
    });

    $.extend(Observer.prototype, {
        toString:      function () {

            return  '[object ' + this.constructor.name + ']';
        },
        destructor:    function () {

            this.$_View.data('[object Observer]', null);

            return {
                $_View:        this.$_View,
                __handle__:    this.__handle__
            };
        },
        valueOf:       function (iEvent, iKey) {

            if (! iEvent)  return  this.__handle__;

            return  (! iKey)  ?  this.__handle__[iEvent]  :
                $.map(this.__handle__[iEvent],  function () {

                    return  arguments[0][ iKey ];
                });
        },
        on:            function (iEvent, iCallback) {

            iEvent = Observer.getEvent(iEvent,  {handler: iCallback});

            var iHandle = this.__handle__[iEvent.type] =
                    this.__handle__[iEvent.type]  ||  [ ];

            for (var i = 0;  iHandle[i];  i++)
                if ($.isEqual(iHandle[i], iEvent))  return this;

            iHandle.push( iEvent );

            return this;
        },
        emit:          function (iEvent, iData) {

            iEvent = Observer.getEvent( iEvent );

            return  (this.__handle__[iEvent.type] || [ ]).reduce(
                (function (_Data_, iHandle) {

                    if (! Observer.match(iEvent, iHandle))  return _Data_;

                    var iResult = iHandle.handler.call(this, iEvent, _Data_);

                    return  (iResult != null)  ?  iResult  :  _Data_;

                }).bind( this ),
                iData
            );
        },
        off:           function (iEvent, iCallback) {

            iEvent = Observer.getEvent(iEvent,  {handler: iCallback});

            this.__handle__[iEvent.type] = $.map(
                this.__handle__[iEvent.type],  function (iHandle) {

                    return  Observer.match(iEvent, iHandle)  ?  null  :  iHandle;
                }
            );

            return this;
        },
        one:           function () {

            var _This_ = this,  iArgs = $.makeArray( arguments );

            var iCallback = iArgs.slice(-1)[0];

            iCallback = (typeof iCallback == 'function')  &&  iArgs.pop();

            var iPromise = new Promise(function (iResolve) {

                    _This_.on.apply(_This_,  iArgs.concat(function () {

                        _This_.off.apply(_This_,  iArgs.concat( arguments.callee ));

                        if ( iCallback )  return  iCallback.apply(this, arguments);

                        iResolve( arguments[1] );
                    }));
                });

            return  iCallback ? this : iPromise;
        }
    });

    return Observer;
});

define('DataScope',['jquery', 'jQueryKit'],  function ($) {

    function DataScope(iSuper) {

        this.__data__ = Object.create(iSuper || { });

        this.__data__.splice = this.__data__.splice || Array.prototype.splice;
    }

    $.extend(DataScope.prototype, {
        commit:      function (iData) {
            var _Data_ = { };

            if ($.likeArray( iData )) {
                _Data_ = [ ];

                this.__data__.splice(0, Infinity);
            }

            for (var iKey in iData)
                if (
                    iData.hasOwnProperty( iKey )  &&  (iData[iKey] != null)  &&  (
                        (typeof iData[iKey] == 'object')  ||
                        (! this.__data__.hasOwnProperty( iKey ))  ||
                        (iData[iKey] != this.__data__[iKey])
                    )
                )  _Data_[iKey] = this.__data__[iKey] = iData[iKey];

            return _Data_;
        },
        watch:       function (iKey, iSetter) {

            if (! (iKey in this))
                Object.defineProperty(this, iKey, {
                    get:    function () {

                        return  this.__data__[iKey];
                    },
                    set:    iSetter.bind(this, iKey)
                });
        },
        valueOf:     function () {

            var iValue = this.__data__.hasOwnProperty('length')  ?
                    Array.apply(null, this.__data__)  :  { };

            for (var iKey in this.__data__)
                if (this.__data__.hasOwnProperty( iKey )  &&  (! $.isNumeric(iKey)))
                    iValue[iKey] = this[iKey];

            return iValue;
        },
        clear:       function () {

            var iData = this.__data__;

            if ( iData.hasOwnProperty('length') )  iData.splice(0, Infinity);

            for (var iKey in iData)  if (iData.hasOwnProperty( iKey )) {

                if ($.likeArray( iData[iKey] ))
                    iData.splice.call(iData[iKey], 0, Infinity);
                else
                    iData[iKey] = '';
            }

            return this;
        }
    });

    return DataScope;
});

define('RenderNode',['jquery'],  function ($) {

    function RenderNode(iNode) {

        this.ownerNode = iNode;

        this.name = iNode.nodeName;
        this.raw = iNode.nodeValue;

        this.ownerElement = iNode.parentNode || iNode.ownerElement;

        this.hasScope = false;
    }

    function Eval(vm) {
        'use strict';

        try {
            var iValue = eval( arguments[1] );

            return  (iValue != null)  ?  iValue  :  '';
        } catch (iError) {
            return '';
        }
    }

    $.extend(RenderNode, {
        safeEval:      function (iValue) {

            switch (typeof iValue) {
                case 'function':    return  iValue.bind( this );
                case 'string':
                    if ((iValue[0] !== '0')  &&  iValue[1])  return iValue;
            }

            return  (iValue  &&  Eval('', iValue))  ||  iValue;
        },
        expression:    /\$\{([\s\S]+?)\}/g,
        reference:     /(this|vm)\.(\w+)/g
    });

    $.extend(RenderNode.prototype, {
        eval:        function (iContext, iScope) {
            var iRefer;

            var iText = this.raw.replace(RenderNode.expression,  function () {

                    iRefer = Eval.call(iContext, iScope, arguments[1]);

                    return  (arguments[0] == arguments[3])  ?
                        arguments[3]  :  iRefer;
                });

            return  (this.raw == iText)  ?  iRefer  :  iText;
        },
        getRefer:    function () {

            var _This_ = this,  iRefer = { };

            this.ownerNode.nodeValue = this.raw.replace(
                RenderNode.expression,  function () {

                    arguments[1].replace(RenderNode.reference,  function () {

                        if (arguments[1] == 'vm')  _This_.hasScope = true;

                        iRefer[ arguments[2] ] = 1;
                    });

                    return '';
                }
            );

            return  Object.keys( iRefer );
        },
        render:      function (iContext, iScope) {

            var iValue = this.eval(iContext, iScope),
                iNode = this.ownerNode,
                iParent = this.ownerElement;

            switch ( iNode.nodeType ) {
                case 3:    {
                    if (! (iNode.previousSibling || iNode.nextSibling))
                        return  iParent.innerHTML = iValue;

                    break;
                }
                case 2:    if (
                    (this.name != 'style')  &&  (this.name in iParent)
                ) {
                    iParent[ this.name ] = RenderNode.safeEval.call(
                        iContext,  iValue
                    );
                    return;

                } else if (! iNode.ownerElement) {
                    if ( iValue )
                        iParent.setAttribute(this.name, iValue);

                    return;
                }
            }

            iNode.nodeValue = iValue;

            return this;
        }
    });

    return RenderNode;
});

define('View',[
    'jquery', 'Observer', 'DataScope', 'RenderNode', 'jQueryKit'
],  function ($, Observer, DataScope, RenderNode) {

    function View($_View, iScope) {

        if (this.constructor == arguments.callee)
            throw TypeError(
                "View() is an Abstract Base Class which can't be instantiated."
            );

        var _This_ = Observer.call(this, $_View);

        DataScope.call($.extend(this, _This_.destructor()),  iScope);

        _This_ = this.constructor.instanceOf(this.$_View, false);

        return  ((_This_ != null)  &&  (_This_ != this))  ?
            _This_  :
            $.extend(this, {
                __name__:     this.$_View[0].name || this.$_View[0].dataset.name,
                __child__:    [ ]
            }).attach();
    }

    $.extend(View.prototype, DataScope.prototype);

    return  $.inherit(Observer, View, {
        signSelector:    function () {
            var _This_ = this;

            $.expr[':'][ this.getClass().toLowerCase() ] = function () {
                return (
                    ($.data(arguments[0], '[object View]') || '') instanceof _This_
                );
            };

            return this;
        },
        Sub_Class:       [ ],
        getSub:          function (iDOM) {

            for (var i = this.Sub_Class.length - 1;  this.Sub_Class[i];  i--)
                if (this.Sub_Class[i].is( iDOM ))
                    return  new this.Sub_Class[i](
                        iDOM,
                        (this.instanceOf( iDOM.parentNode )  ||  '').__data__
                    );
        },
        extend:          function (iConstructor, iStatic, iPrototype) {

            this.Sub_Class.push( iConstructor );

            return $.inherit(
                this, iConstructor, iStatic, iPrototype
            ).signSelector();
        },
        instanceOf:      function ($_Instance, Check_Parent) {

            var _Instance_;  $_Instance = $( $_Instance );

            do {
                _Instance_ = $_Instance.data('[object View]');

                if (_Instance_ instanceof this)  return _Instance_;

                $_Instance = $_Instance.parent();

            } while ($_Instance[0]  &&  (Check_Parent !== false));
        },
        getObserver:     function (iDOM) {

            return  this.instanceOf(iDOM, false)  ||  new Observer( iDOM );
        },
        setEvent:        function (iDOM) {

            $.each(iDOM.attributes,  function () {

                var iName = (this.nodeName.match(/^on(\w+)/i) || '')[1];

                if ((! iName)  ||  (this.nodeName in iDOM))  return;

                Object.defineProperty(iDOM,  'on' + iName,  {
                    set:    function (iHandler) {

                        var iView = View.getObserver( iDOM );

                        iView.off( iName );

                        if (typeof iHandler == 'function')
                            iView.on(iName, iHandler);
                    },
                    get:    function () {

                        return Observer.prototype.valueOf.call(
                            View.getObserver( iDOM ),  iName,  'handler'
                        )[0];
                    }
                });
            });

            return iDOM;
        }
    }, {
        attrWatch:     function () {
            var _This_ = this;

            this.__observer__ = new self.MutationObserver(function () {

                var iData = { };

                $.each(arguments[0],  function () {

                    var iNew = this.target.getAttribute( this.attributeName );

                    if (
                        (iNew != this.oldValue)  &&
                        (! (this.oldValue || '').match( RenderNode.expression ))
                    )
                        iData[$.camelCase( this.attributeName.slice(5) )] = iNew;
                });

                if (! $.isEmptyObject( iData ))
                    _This_.render( iData ).emit({
                        type:      'update',
                        target:    _This_.$_View[0]
                    }, iData);
            });

            this.__observer__.observe(this.$_View[0], {
                attributes:           true,
                attributeOldValue:    true,
                attributeFilter:      $.map(
                    Object.keys( this.$_View[0].dataset ),
                    function () {
                        return  'data-'  +  $.hyphenCase( arguments[0] );
                    }
                )
            });
        },
        attach:        function () {

            if (! this.$_View[0].id)
                this.$_View[0].id = this.__id__ || $.uuid('View');

            this.__id__ = this.$_View[0].id;

            this.$_View.data('[object View]', this);

            if ( this.$_View[0].dataset.href )  this.attrWatch();

            this.emit({
                type:      'attach',
                target:    this.$_View.append( this.$_Content )[0]
            });

            return this;
        },
        detach:        function () {

            if ( this.$_View[0].id.match(/^View_\w+/) )  this.$_View[0].id = '';

            this.$_View.data('[object View]', null);

            if (this.__observer__) {
                this.__observer__.disconnect();

                delete this.__observer__;
            }

            this.$_Content = this.$_View.children().detach();

            return this;
        },
        filter:        function (Sub_View, iDOM) {
            var iView;

            if ( iDOM.dataset.href ) {

                this.__child__.push( iDOM );

                return NodeFilter.FILTER_REJECT;

            } else if (
                iDOM.dataset.name  ||
                (iView = View.instanceOf(iDOM, false))
            ) {
                Sub_View.push(iView  ||  View.getSub( iDOM ));

                return NodeFilter.FILTER_REJECT;
            } else if (
                (iDOM.parentNode == document.head)  &&
                (iDOM.tagName.toLowerCase() != 'title')
            )
                return NodeFilter.FILTER_REJECT;

            return NodeFilter.FILTER_ACCEPT;
        },
        scan:          function (iParser) {
            var Sub_View = [ ];

            var iFilter = {acceptNode:  this.filter.bind(this, Sub_View)};

            var iSearcher = document.createTreeWalker(
                    this.$_View[0],
                    1,
                    ($.browser.msie < 12)  ?  iFilter.acceptNode  :  iFilter,
                    true
                );

            iParser.call(this, this.$_View[0]);

            var iPointer,  iNew,  iOld;

            while (iPointer = iPointer || iSearcher.nextNode()) {

                iNew = iParser.call(this, iPointer);

                if (iNew == iPointer) {
                    iPointer = null;
                    continue;
                }

                $( iNew ).insertTo(iPointer.parentNode,  $( iPointer ).index() + 1);

                iOld = iPointer;

                iPointer = iSearcher.nextNode();

                $( iOld ).remove();
            }

            for (var i = 0;  this.__child__[i];  i++)
                iParser.call(this,  View.setEvent( this.__child__[i] ));

            for (var i = 0;  Sub_View[i];  i++)
                iParser.call(this, Sub_View[i]);
        },
        childOf:       function (iSelector) {

            return  iSelector  ?
                View.instanceOf(this.$_View.find(iSelector + '[data-href]'))  :
                this.__child__;
        }
    }).signSelector();
});

define('DOMkit',['jquery', 'RenderNode', 'jQueryKit'],  function ($, RenderNode) {

    var Link_Name = $.makeSet('a', 'area', 'form');

    return {
        fixScript:      function (iDOM) {
            var iAttr = { };

            $.each(iDOM.attributes,  function () {

                iAttr[ this.nodeName ] = this.nodeValue;
            });

            iDOM = $('<script />', iAttr)[0];

            return iDOM;
        },
        fixLink:        function (iDOM) {
            if (
                ((iDOM.target || '_self')  ==  '_self')  &&
                ($.urlDomain(iDOM.href || iDOM.action)  !=  $.urlDomain())
            )
                iDOM.target = '_blank';
        },
        parsePath:      function (iPath) {

            var iNew;  iPath = iPath.replace(/^\.\//, '').replace(/\/\.\//g, '/');

            do {
                iPath = iNew || iPath;

                iNew = iPath.replace(/[^\/]+\/\.\.\//g, '');

            } while (iNew != iPath);

            return iNew;
        },
        fixURL:         function (iDOM, iKey, iBase) {

            var iURL = iDOM.getAttribute( iKey )  ||  '';

            if ((iURL.match( RenderNode.expression ) || [ ]).join('')  ==  iURL)
                return iURL;

            iURL = iURL.split('?');

            if (
                iBase  &&  iURL[0]  &&
                (! $.urlDomain( iURL[0] ))  &&  (iURL[0].indexOf( iBase )  <  0)
            ) {
                iURL[0] = this.parsePath(iBase + iURL[0]);

                iDOM.setAttribute(iKey, iURL.join('?'));
            }

            return iURL.join('?');
        },
        prefetch:       function (iDOM, iURL) {
            if (
                (iDOM.tagName.toLowerCase() in Link_Name)  &&
                ((iDOM.target || '_self')  ==  '_self')  &&
                (! (
                    iURL.match( RenderNode.expression )  ||
                    $('head link[href="' + iURL + '"]')[0]
                ))
            )
                $('<link />', {
                    rel:     (($.browser.msie < 11)  ||  $.browser.ios)  ?
                        'next'  :  'prefetch',
                    href:    iURL
                }).appendTo( document.head );
        }
    };
});
define('HTMLView',[
    'jquery', 'View', 'DOMkit', 'RenderNode', 'jQueryKit'
],  function ($, View, DOMkit, RenderNode) {

    function HTMLView($_View, iScope) {

        var _This_ = View.call(this, $_View, iScope);

        if (this != _This_)  return _This_;

        $.extend(this, {
            length:     0,
            __map__:    { },
        }).on('attach',  function () {

            this.$_View.find('style, link[rel="stylesheet"]').each(function () {

                View.instanceOf( this ).fixStyle( this );
            });
        });
    }

    return  View.extend(HTMLView, {
        is:             function () {
            return true;
        },
        rawSelector:    $.makeSet('code', 'xmp', 'template')
    }, {
        parseSlot:     function (iNode) {

            iNode = iNode.getAttribute('name');

            var $_Slot = this.$_Content.filter(
                    iNode  ?
                        ('[slot="' + iNode + '"]')  :  '[slot=""], :not([slot])'
                );
            this.$_Content = this.$_Content.not( $_Slot );

            return $_Slot;
        },
        fixStyle:      function (iDOM) {

            var iTag = iDOM.tagName.toLowerCase();

            if ((iTag == 'link')  &&  (! iDOM.sheet))
                return  iDOM.onload = arguments.callee.bind(this, iDOM);

            var CSS_Rule = $.map(iDOM.sheet.cssRules,  function (iRule) {

                    switch ( iRule.type ) {
                        case 1:    return  iRule;
                        case 4:    return  Array.apply(null, iRule.cssRules);
                    }
                });

            for (var i = 0;  CSS_Rule[i];  i++)
                CSS_Rule[i].selectorText = '#' + this.__id__ + ' ' +
                    CSS_Rule[i].selectorText;

            if (iTag == 'style')  iDOM.disabled = false;
        },
        fixDOM:        function (iDOM) {
            var iKey = 'src';

            switch ( iDOM.tagName.toLowerCase() ) {
                case 'link':      {
                    if (('rel' in iDOM)  &&  (iDOM.rel != 'stylesheet'))
                        return iDOM;

                    iKey = 'href';
                }
                case 'style':     this.fixStyle( iDOM );    break;
                case 'script':    iDOM = DOMkit.fixScript( iDOM );    break;
                case 'img':       ;
                case 'iframe':    ;
                case 'audio':     ;
                case 'video':     break;
                case 'a':         ;
                case 'area':      ;
                case 'form':      {
                    iKey = ('href' in iDOM)  ?  'href'  :  'action';

                    DOMkit.fixLink( iDOM );    break;
                }
                default:          iKey = 'data-href';
            }

            DOMkit.prefetch(iDOM,  DOMkit.fixURL(iDOM, iKey, this.__base__));

            return iDOM;
        },
        signIn:        function (iNode, iName) {

            for (var i = 0;  this[i];  i++)  if (this[i] == iNode)  return;

            this[this.length++] = iNode;

            for (var j = 0;  iName[j];  j++)
                this.__map__[iName[j]] = (this.__map__[iName[j]] || 0)  +
                    Math.pow(2, i);
        },
        parsePlain:    function (iDOM) {
            var _This_ = this;

            $.each(
                Array.prototype.concat.apply(
                    $.makeArray( iDOM.attributes ),  iDOM.childNodes
                ),
                function () {
                    if ((! this.nodeValue)  ||  (
                        (this.nodeType != 2)  &&  (this.nodeType != 3)
                    ))
                        return;

                    var iTemplate = new RenderNode( this );

                    var iName = iTemplate.getRefer();

                    if (! iName[0])  return;

                    _This_.signIn(iTemplate, iName);

                    if ((! this.nodeValue)  &&  (this.nodeType == 2)  &&  (
                        ($.propFix[this.nodeName] || this.nodeName)  in
                        this.ownerElement
                    ))
                        this.ownerElement.removeAttribute( this.nodeName );
                }
            );
        },
        parse:         function (BaseURL, iTemplate) {

            this.__base__ = BaseURL;

            if ( iTemplate ) {
                this.$_Content = this.$_View.children().detach();

                this.$_View[0].innerHTML = iTemplate;
            }

            this.scan(function (iNode) {

                if (iNode instanceof Element) {

                    if (iNode.tagName.toLowerCase() == 'slot')
                        return $.map(
                            this.parseSlot( iNode ),  arguments.callee.bind( this )
                        );

                    if (
                        (iNode != this.$_View[0])  &&
                        (iNode.outerHTML != this.lastParsed)
                    ) {
                        iNode = this.fixDOM( iNode );

                        this.lastParsed = iNode.outerHTML;
                    }
                }

                switch (true) {
                    case (iNode instanceof View):
                        this.signIn(iNode, [iNode.__name__]);    break;
                    case (
                        $.expr[':'].field( iNode )  &&  (iNode.type != 'file')  &&
                        (! iNode.defaultValue)
                    ):
                        this.signIn(iNode, [iNode.name]);
                    case !(
                        iNode.tagName.toLowerCase() in HTMLView.rawSelector
                    ):
                        this.parsePlain( iNode );
                }

                return iNode;
            });

            delete this.$_Content;

            return this;
        },
        getNode:       function () {

            var iMask = '0',  _This_ = this;

            for (var iName in arguments[0])
                if (this.__map__.hasOwnProperty( iName ))
                    iMask = $.bitOperate('|',  iMask,  this.__map__[ iName ]);

            return  $.map(iMask.split('').reverse(),  function (iBit, Index) {

                if ((iBit > 0)  ||  (_This_[Index] || '').hasScope)
                    return _This_[Index];
            });
        },
        render:        function (iData) {

            var _This_ = this,  _Data_ = { };

            if (typeof iData.valueOf() == 'string') {

                _Data_[iData] = arguments[1];
                iData = _Data_;
            }

            iData = this.commit( iData );  _Data_ = this.__data__;

            for (var iKey in iData)  this.watch(iKey, arguments.callee);

            if ( iData )
                $.each(this.getNode( iData ),  function () {

                    if (this instanceof RenderNode)
                        this.render(_This_, _Data_);
                    else if (this instanceof View)
                        this.render(_Data_[this.__name__]);
                    else
                        $( this )[
                            ('value' in this)  ?  'val'  :  'html'
                        ](
                            _Data_[this.name || this.getAttribute('name')]
                        );
                });

            return this;
        }
    });
});
define('ListView',['jquery', 'View', 'HTMLView'],  function ($, View, HTMLView) {

    function ListView() {

        var _This_ = View.apply(this, arguments);

        if (this != _This_)  return _This_;

        this.__HTML__ = this.$_View.html();

        this.clear();
    }

    return  View.extend(ListView, {
        is:    $.expr[':'].list
    }, {
        splice:     Array.prototype.splice,
        clear:      function () {
            this.$_View.empty();

            this.splice(0, Infinity);

            return this;
        },
        insert:     function (iData, Index) {

            var Item = (new HTMLView(this.__HTML__, this.__data__)).parse();

            Item.$_View.insertTo(this.$_View, Index);

            iData.__index__ = Index || 0;

            this.splice(iData.__index__,  0,  Item.render( iData ));

            return Item;
        },
        render:     function (iList) {

            if ($.likeArray( iList ))
                $.map(iList,  this.insert.bind( this ));

            return this;
        },
        indexOf:    function ($_Item) {

            $_Item = ($_Item instanceof $)  ?  $_Item  :  $( $_Item );

            return (
                ($_Item[0].parentNode == this.$_View[0])  ?
                    $_Item  :  $_Item.parentsUntil( this.$_View )
            ).index();
        },
        remove:     function (Index) {

            var Item = this.splice(
                    $.isNumeric( Index )  ?  Index  :  this.indexOf( Index ),  1
                )[0];

            Item.$_View.remove();

            return Item;
        },
        sort:       function () {

            Array.prototype.sort.call(this, arguments[0]);

            this.$_View.append($.map(this,  function (Item) {

                Item.__index__ = arguments[1];

                return Item.$_View[0];
            }));

            return this;
        },
        childOf:    function () {

            return  $.map(this,  function () {

                return  arguments[0].__child__;
            });
        },
        valueOf:    function () {

            return  $.map(this,  function () {

                return arguments[0].valueOf();
            });
        }
    });
});
define('InnerLink',['jquery', 'Observer', 'jQueryKit'],  function ($, Observer) {

    function InnerLink(Link_DOM) {

        var _This_ = Observer.call(this, Link_DOM);

        if (_This_ != this)  this.__handle__ = _This_.__handle__;

        this.target = Link_DOM.tagName.match(/^(a|area|form)$/i) ? 'page' : 'view';

        this.method = (
            Link_DOM.getAttribute('method') || Link_DOM.dataset.method || 'Get'
        ).toUpperCase();

        this.contentType =
            Link_DOM.getAttribute('type') || Link_DOM.getAttribute('enctype') ||
            'application/x-www-form-urlencoded';

        this.setURI().title = Link_DOM.title || document.title;
    }

    return  $.inherit(Observer, InnerLink, {
        HTML_Link:    'a[href], area[href], form[action]',
        Self_Link:    '[data-href]:not(a, form)'
    }, {
        setURI:      function () {

            var Link_DOM = this.$_View[0];

            this.href = Link_DOM.dataset.href ||
                Link_DOM.getAttribute(Link_DOM.href ? 'href' : 'action');

            this.src = this.href.split(/\?data=|&data=/);

            this.href = this.src[0];

            this.src = this.src[1];

            this.data = $.paramJSON( this.href );

            this.href = this.href.split('?')[0];

            return this;
        },
        getURI:      function () {

            var iData = [$.param( this.data )];

            if (! iData[0])  iData.length = 0;

            if ( this.src )  iData.push('data=' + this.src);

            iData = iData.join('&');

            return  (this.href || '')  +  (iData  &&  ('?' + iData));
        },
        loadData:    function () {

            var URI = this.method + ' ';

            var iOption = {
                    type:           this.method,
                    beforeSend:     arguments[0],
                    contentType:    this.contentType,
                    dataType:
                        (this.src.match(/\?/g) || '')[1]  ?  'jsonp'  :  'json',
                    complete:       function () {
                        URI += this.url;
                    }
                };

            if ( this.$_View[0].tagName.match(/^(a|area)$/i) ) {

                iOption.data = $.extend({ }, this.$_View[0].dataset);

                delete iOption.data.method;
                delete iOption.data.autofocus;

            } else if (! this.$_View.find('input[type="file"]')[0]) {

                iOption.data = $.paramJSON('?' + this.$_View.serialize());
            } else {
                iOption.data = new self.FormData( this.$_View[0] );
                iOption.contentType = iOption.processData = false;
            }

            if ( this.contentType.match(/^application\/json/) ) {

                iOption.data = JSON.stringify( iOption.data );

                iOption.processData = false;
            }

            var iJSON = Promise.resolve( $.ajax(this.src, iOption) );

            return  (this.method != 'GET')  ?  iJSON  :  iJSON.then(
                function () {
                    return  $.storage(URI, arguments[0]);
                },
                function () {
                    return  $.storage( URI );
                }
            );
        },
        load:        function (onRequest) {

            return Promise.all([
                this.href  &&  $.ajax({
                    type:          'GET',
                    url:           this.href,
                    beforeSend:    onRequest
                }),
                this.src  &&  this.loadData( onRequest )
            ]);
        },
        valueOf:     function () {
            var _This_ = { };

            for (var iKey in this)
                if (
                    (typeof this[iKey] != 'object')  &&
                    (typeof this[iKey] != 'function')
                )
                    _This_[iKey] = this[iKey];

            _This_.target = this.$_View[0];

            return _This_;
        }
    });
});
define('WebApp',[
    'jquery', 'Observer', 'View', 'HTMLView', 'ListView', 'InnerLink'
],  function ($, Observer, View, HTMLView, ListView, InnerLink) {

    function WebApp(Page_Box, API_Root) {

        if (this instanceof $)
            return  new arguments.callee(this[0], Page_Box, API_Root);

        var _This_ = $('*:data("_EWA_")').data('_EWA_') || this;

        if ((_This_ != null)  &&  (_This_ != this))  return _This_;

        Observer.call(this, Page_Box).destructor().$_View.data('_EWA_', this);

        this.apiRoot = API_Root || '';

        var iPath = self.location.href.split('?')[0];

        this.pageRoot = $.filePath(
            iPath  +  (iPath.match(/\/([^\.]+\.html?)?/i) ? '' : '/')
        ) + '/';

        this.length = 0;
        this.lastPage = -1;
        this.loading = { };

        self.setTimeout( this.listenDOM().listenBOM().boot.bind( this ) );
    }

    return  $.inherit(Observer, WebApp, {
        View:        View,
        HTMLView:    HTMLView,
        ListView:    ListView
    }, {
        splice:       Array.prototype.splice,
        switchTo:     function (Index) {

            if (this.lastPage == Index)  return;

            var iPage = View.instanceOf(this.$_View, false);

            if ( iPage )  iPage.detach();

            if (this.lastPage > -1)  this[ this.lastPage ].view = iPage;

            iPage = (this[ Index ]  ||  '').view;

            return  iPage && iPage.attach();
        },
        setRoute:     function (iLink) {

            this.switchTo();

            var iLast = this[ this.lastPage ],  iURI = iLink.getURI();

            if (iLast  &&  (iLast.getURI()  ==  iURI))  return;

            if (++this.lastPage != this.length)
                this.splice(this.lastPage, Infinity);

            self.history.pushState(
                {index: this.length},
                document.title = iLink.title,
                '#!'  +  self.btoa( iURI )
            );
            this[ this.length++ ] = iLink;
        },
        getRoute:     function () {
            return self.atob(
                (self.location.hash.match(/^\#!(.+)/) || '')[1]  ||  ''
            );
        },
        getCID:       function () {
            return  arguments[0].replace(this.pageRoot, '')
                .replace(/\.\w+(\?.*)?/i, '.html');
        },
        _emit:        function (iType, iLink, iData) {

            return this.emit(
                $.extend(iLink.valueOf(), {
                    type:      iType,
                    target:
                        (iLink.target == 'page')  ?  this.$_View[0]  :  undefined
                }),
                iData
            );
        },
        loadView:     function (iLink, iHTML) {

            var $_Target = iLink.$_View;

            if (iLink.target == 'page') {

                this.setRoute( iLink );

                $_Target = this.$_View;
            }

            iHTML = this._emit('template', iLink, iHTML);

            var iView = View.getSub( $_Target[0] );

            if (! $_Target.children()[0]) {

                $_Target[0].innerHTML = iHTML;

                iHTML = '';
            }

            if ( iView.parse )
                iView.parse(
                    iLink.href  ?
                        ($.filePath(iLink.href) + '/')  :
                        (iView.$_View.parents(':view').view() || '').__base__,
                    iHTML
                );

            if (! $_Target.find('script[src]:not(head > *)')[0])
                iLink.emit('load');

            return iView;
        },
        loadComponent:    function (iLink, iHTML, iData) {

            this.loading[ iLink.href ] = iLink;

            var JS_Load = iLink.one('load');

            var iView = this.loadView(iLink, iHTML),  _This_ = this;

            return  JS_Load.then(function (iFactory) {

                delete _This_.loading[ iLink.href ];

                var _Data_ = (iData instanceof Array)  ?  [ ]  :  { };

                iData = $.extend(
                    _Data_,  iLink.data,  iLink.$_View[0].dataset,  iData
                );

                if ( iFactory )
                    iData = $.extend(_Data_,  iData,  iFactory.call(iView, iData));

                iView.render( iData );

            }).then(function () {

                return Promise.all($.map(
                    iView.childOf(),  _This_.load.bind(_This_)
                ));
            }).then(function () {  return iView;  });
        },
        load:         function (iLink) {

            if (iLink instanceof Element)
                iLink = new InnerLink( iLink );

            var _This_ = this;

            return  iLink.load(function () {
                if (
                    ((this.dataType || '').slice(0, 4) == 'json')  &&
                    (! $.urlDomain( this.url ))
                )
                    this.url = _This_.apiRoot + this.url;

                _This_.emit($.extend(iLink.valueOf(), {type: 'request'}),  {
                    option:       this,
                    transport:    arguments[0]
                });

                this.crossDomain = $.isCrossDomain( this.url );

            }).then(function () {

                var iHTML = arguments[0][0],  iData = arguments[0][1];

                if (iData != null)  iData = _This_._emit('data', iLink, iData);

                if (iLink.href  ||  (iLink.target == 'view'))
                    return  _This_.loadComponent(iLink, iHTML, iData);

            }).then(function (iView) {

                if (iView instanceof View)  _This_._emit('ready', iLink, iView);
            });
        },
        listenDOM:    function () {
            var _This_ = this;

            $('html').on('input change',  ':field',  $.throttle(function () {

                var iView = HTMLView.instanceOf( this );

                if ( iView )
                    iView.render(
                        this.name || this.getAttribute('name'),
                        $(this).value('name')
                    );
            })).on('click submit',  InnerLink.HTML_Link,  function (iEvent) {
                if (
                    ((this.tagName == 'FORM')  &&  (iEvent.type != 'submit'))  ||
                    ((this.target || '_self')  !=  '_self')
                )
                    return;

                var CID = (this.href || this.action).match(_This_.pageRoot);

                if ((CID || '').index === 0) {

                    iEvent.preventDefault();

                    _This_.load( this );
                }
            });

            return this;
        },
        listenBOM:    function () {
            var _This_ = this;

            $(self).on('popstate',  function () {

                var Index = (arguments[0].originalEvent.state || '').index;

                if (_This_[Index]  &&  (_This_.lastPage != Index))
                    Promise.resolve(
                        _This_.switchTo( Index )  ||  _This_.load( _This_[Index] )
                    ).then(function () {

                        _This_.lastPage = Index;

                        document.title = _This_[Index].title;
                    });
            });

            return this;
        },
        boot:         function () {
            var _This_ = this;

            return Promise.all($.map(
                $('[data-href]:not([data-href] *)').not(
                    this.$_View.find('[data-href]')
                ),
                function () {
                    return  _This_.load( arguments[0] );
                }
            )).then(function () {

                var Init = _This_.getRoute();

                if ( Init )
                    return  _This_.load( $('<a />',  {href: Init})[0] );

                $('a[href][data-autofocus="true"]').eq(0).click();
            });
        }
    });
});
//
//                    >>>  EasyWebApp.js  <<<
//
//
//      [Version]    v4.0  (2017-06-06)  Beta
//
//      [Require]    iQuery  ||  jQuery with jQueryKit
//
//      [Usage]      A Light-weight SPA Engine with
//                   jQuery Compatible API.
//
//
//              (C)2015-2017    shiy2008@gmail.com
//


define('EasyWebApp',['jquery', 'WebApp'].concat( EWA_Polyfill ),  function ($, WebApp) {

/* ---------- AMD based Component API ---------- */

    var _require_ = self.require,  _CID_;

    self.require = function () {

        if (! document.currentScript)  return _require_.apply(this, arguments);

        var iArgs = arguments,  iWebApp = new WebApp();

        var CID = iWebApp.getCID( document.currentScript.src );

        _require_.call(this,  iArgs[0],  function () {

            _CID_ = CID;

            return  iArgs[1].apply(this, arguments);
        });
    };

    $.extend(WebApp.fn = WebApp.prototype,  {
        component:    function (iFactory) {

            if ( this.loading[_CID_] )  this.loading[_CID_].emit('load', iFactory);

            return this;
        },
        loadPage:     function (iURI) {
            var _This_ = this;

            return  (! iURI)  ?  Promise.resolve('')  :  (new Promise(function () {

                $( self ).one('popstate', arguments[0])[0].history.go( iURI );

            })).then(function () {

                return  _This_.load( _This_[_This_.lastPage] );
            });
        }
    });

/* ---------- jQuery based Helper API ---------- */

    $.fn.view = function (Class_Name) {

        if (! this[0])  return;

        return  Class_Name  ?
            (new WebApp[Class_Name](this[0], arguments[1]))  :
            WebApp.View.instanceOf(this[0], false);
    };

    return  $.fn.iWebApp = WebApp;
});
