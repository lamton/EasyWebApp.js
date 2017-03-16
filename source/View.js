define(['jquery', 'jQuery+'],  function ($) {

    function View($_View) {

        this.$_View = ($_View instanceof $)  ?  $_View  :  $( $_View );

        var _This_ = this.constructor.instanceOf(this.$_View, false);

        if ((_This_ != null)  &&  (_This_ != this))  return _This_;

        this.__id__ = $.uuid('View');
        this.__name__ = this.$_View.attr('name');

        this.$_View.data('[object View]', this);

        return this;
    }

    $.extend(View.prototype, {
        toString:      function () {

            var iName = this.constructor.name;

            return  '[object ' + (
                (typeof iName == 'function')  ?  this.constructor.name()  :  iName
            )+ ']';
        },
        destructor:    function () {

            this.$_View.data('[object View]', null).empty();

            delete this.__data__;
        },
        scope:         function (iSup) {
            this.__data__ = iSup;

            for (var i = 0;  this[i];  i++)
                if (this[i] instanceof View)  this[i].scope( iSup );

            return this;
        }
    });

    $.each(['trigger', 'on', 'one', 'off'],  function (Index, iName) {

        View.prototype[this] = function () {

            if ( Index )  arguments[0] += '.EWA_View';

            $.fn[iName].apply(this.$_View, arguments);

            return this;
        };
    });

    $.extend(View, {
        getClass:        function () {

            return this.prototype.toString.call(
                {constructor: this}
            ).split(' ')[1].slice(0, -1);
        },
        signSelector:    function () {
            var _This_ = this;

            $.expr[':'][ this.getClass().toLowerCase() ] = function () {
                return (
                    ($.data(arguments[0], '[object View]') || '') instanceof _This_
                );
            };

            return this;
        }
    });

    return  $.extend(View.signSelector(),  {
        extend:        function (iConstructor, iStatic, iPrototype) {
            return $.inherit(
                this, iConstructor, iStatic, iPrototype
            ).signSelector();
        },
        instanceOf:    function ($_Instance, Check_Parent) {

            var _Instance_;  $_Instance = $( $_Instance );

            do {
                _Instance_ = $_Instance.data('[object View]');

                if (_Instance_ instanceof this)  return _Instance_;

                $_Instance = $_Instance.parent();

            } while ($_Instance[0]  &&  (Check_Parent !== false));
        }
    });
});