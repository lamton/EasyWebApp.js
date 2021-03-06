define([
    'jquery', './View', './DOMkit', './RenderNode'
],  function ($, View, DOMkit, RenderNode) {

    /**
     * 普通视图类（对应 JSON 对象）
     *
     * @author  TechQuery
     *
     * @class   HTMLView
     * @extends View
     *
     * @param   {jQueryAcceptable} $_View  - Container DOM of HTMLView
     * @param   {object}           [scope] - Data object as a scope
     * @param   {(string|URL)}     [base]
     *
     * @returns {HTMLView}             Return the last one if a HTMLView instance
     *                                 has been created on this element
     */

    function HTMLView($_View, scope, base) {

        var _This_ = View.call(this, $_View, scope, base);
        /**
         * 本视图的插卡元素
         *
         * @name $_Slot
         * @type {jQuery}
         *
         * @memberof HTMLView
         * @instance
         *
         * @readonly
         */
        this.$_Slot = $();

        return  (_This_ !== this)  ?
            _This_ :
            this.setPrivate( {length: 0,  map: { }} );
    }

    View.extend(HTMLView, {
        is:             function () {

            return  (! $.expr[':'].list( arguments[0] ));
        },
        rawSelector:    $.makeSet('code', 'xmp', 'template'),
        getValue:       function (field) {

            if (field.type !== 'checkbox')
                return  $( field )[('value' in field) ? 'val' : 'html']();

            field = field.form.elements[ field.name ];

            return  $.likeArray( field )  ?
                $.map(field,  function (_This_) {

                    return  _This_.checked ? _This_.value : null;
                })  :  (
                    field.checked ? field.value : ''
                );
        }
    }, {
        indexOf:       Array.prototype.indexOf,
        signIn:        function (node) {

            for (var i = 0;  this[i];  i++)  if (this[i] == node)  return;

            this[this.length++] = node;

            var name = (node instanceof RenderNode)  ?
                    node  :  [node.__name__];

            for (var j = 0;  name[j];  j++)  try {

                this.watch( name[j] ).__map__[name[j]] =
                    (this.__map__[name[j]] || 0)  +  Math.pow(2, i);

            } catch (error) {

                console.warn( error );
            }
        },
        parsePlain:    function (node) {

            if (! (node.nodeValue || node.value))  return;

            var render = new RenderNode( node );

            if (! render.type)  return;

            this.signIn( render );

            if (node.nodeType === 8) {

                render.ownerNode = node =
                    document.createTextNode( node.nodeValue );

                render.DOMType = 'Text';
            }

            return node;
        },
        parseNode:     function (type, node) {

            if ((node instanceof View)  &&  (this.indexOf( node )  <  0))
                return  this.signIn( node );

            switch ($.Type( node )) {
                case 'Text':           ;
                case 'Comment':
                    return  this.parsePlain( node );
                case 'HTMLElement':
                    if (type in HTMLView.rawSelector)
                        return null;
                    else
                        Array.from(
                            $.makeArray( node.attributes ),
                            this.parsePlain,
                            this
                        );
            }
        },
        parseVM:       function () {

            return  this.scan(function (node) {

                var $_View = this.$_View,
                    type = (node.nodeName || '').toLowerCase();

                if ((node instanceof Node)  &&  (node !== $_View[0]))
                    switch ( type ) {
                        case 'style':
                            return  DOMkit.fixStyle($_View, node);
                        case 'link':
                            return  DOMkit.loadCSS($_View, node, this.__base__);
                        case 'script':
                            return  DOMkit.fixScript( node );
                    }

                return  this.parseNode(type, node);
            });
        },
        fixLink:       function () {

            if (! this.__base__)  return;

            var $_Link = this.$_View.find('*');

            if (! this.$_View[0].parentElement)  $_Link = $_Link.addBack();

            $_Link.filter( DOMkit.URL_DOM ).not('head > *').each(
                $.proxy(DOMkit.fixURL, null, this.__base__)
            );
        },
        parseSlot:     function () {

            var _this_ = this, $_Slot = $();

            this.$_View.find('slot').replaceWith(function () {

                var slot = this.getAttribute('name');

                slot = _this_.$_Slot.filter(
                    slot  ?
                        ('[slot="' + slot + '"]')  :
                        function () {
                            return  this.getAttribute &&
                                (! this.getAttribute('slot'));
                        }
                );

                return  slot[0]  ?
                    ($.merge($_Slot, slot)  &&  slot)  :  $( this ).contents();
            });

            this.$_Slot = $_Slot;
        },
        parseHTML:     function (template) {

            var fresh;

            if (template = (template || '').trim()) {

                if ( this.$_View[0].innerHTML.trim() )
                    this.$_Slot = this.$_View.contents().detach();

                if (fresh  =  (! this.$_View[0].innerHTML.trim()))
                    this.$_View[0].innerHTML = template;
            }

            this.$_View.children('template').replaceWith(function () {

                return  $( this ).contents();
            });

            if ( fresh ) {

                this.fixLink();

                this.parseSlot();
            }

            return this;
        },
        /**
         * HTML 模板解析
         *
         * @author TechQuery
         *
         * @memberof HTMLView.prototype
         *
         * @param {string} [template] - A HTML String of the Component's template
         *                              with HTMLSlotElement
         * @return {HTMLView}  Current HTMLView
         */
        parse:         function (template) {

            return  this.parseHTML( template ).parseVM();
        },
        nodeOf:        function (data, exclude, forEach) {

            forEach = (forEach instanceof Function)  &&  forEach;

            var iMask = '0',  _This_ = this;

            for (var iName in data)
                if (this.__map__.hasOwnProperty( iName ))
                    iMask = $.bitOperate('|',  iMask,  this.__map__[ iName ]);

            return $.map(
                iMask.padStart(this.length, 0).split('').reverse(),
                function (bit, node) {

                    node = _This_[ node ];

                    if ((
                        (bit > 0)  ||  ((node || '').type > 1)
                    ) && (
                        !(node instanceof RenderNode)  ||
                        (node.name !== 'value')  ||
                        (node.ownerElement !== exclude)
                    )) {
                        forEach  &&  forEach.call(_This_, node);

                        return node;
                    }
                }
            );
        },
        /**
         * 渲染视图
         *
         * @author   TechQuery
         *
         * @memberof HTMLView.prototype
         *
         * @param    {string|object} data    - Property Key or Data Object
         * @param    {*}             [value] - Property Value
         *
         * @returns  {HTMLView}      Current HTMLView
         */
        render:        function (data, value) {

            var _Data_ = { },  exclude;

            if (data instanceof Element) {

                exclude = data;

                data = exclude.getAttribute('name');

                value = HTMLView.getValue( exclude );
            }

            if (typeof data.valueOf() === 'string') {

                _Data_[data] = value;    data = _Data_;
            }

            _Data_ = this.__data__;

            this.nodeOf(_Data_.commit( data ),  exclude,  function (node) {

                if (node instanceof RenderNode)
                    node.render(this, _Data_);
                else if (node instanceof View) {

                    node.render(_Data_[node.__name__]);

                    _Data_[node.__name__] = node.__data__;
                }
            });

            return this;
        }
    }).registerEvent('template');

//  Render data from user input

    function reRender() {

        var view = HTMLView.instanceOf( this );

        if ( view )  view.render( this );
    }

    $('html').on('change', ':field', reRender).on(
        'input',  ':field',  $.throttle( reRender )
    ).on('reset',  'form',  function () {

        var data = $.paramJSON('?'  +  $( this ).serialize());

        for (var key in data)  data[ key ] = '';

        HTMLView.instanceOf( this ).render( data );
    });

    return HTMLView;

});
