/*  Copyright 2016 Stanislav Krotov <https://it-projects.info/team/ufaks>
    Copyright 2018-2020 Kolushov Alexandr <https://it-projects.info/team/KolushovAlexandr>
    License MIT (https://opensource.org/licenses/MIT). */
odoo.define("pos_product_available_negative.pos", function (require) {
    "use strict";

    var screens = require("point_of_sale.screens");
    var models = require("point_of_sale.models");
    var core = require("web.core");
    var _t = core._t;

    screens.PaymentScreenWidget.include({
        validate_order: function (force_validation) {
            var self = this;
            var _super = this._super;
            var order = this.pos.get_order();
            var orderlines = order.get_orderlines();
            var has_negative_product = false;
            for (var i = 0; i < orderlines.length; i++) {
                var line = orderlines[i];
                if (
                    line.product.type === "product" &&
                    line.product.qty_available < line.quantity
                ) {
                    has_negative_product = true;
                    self.gui
                        .sudo_custom({
                            title: _t(
                                "Order has out-of-stock product and must be approved by supervisor"
                            ),
                            special_group: this.pos.config.negative_order_group_id[0],
                            do_not_change_cashier: true,
                            arguments: {ask_untill_correct: true},
                        })
                        .done(function (user) {
                            order.negative_stock_user_id = user;
                            _super.call(self, force_validation);
                        });
                    break;
                }
            }
            if (!has_negative_product) {
                this._super(force_validation);
            }
        },
    });

    var _super_order = models.Order.prototype;
    models.Order = models.Order.extend({
        export_as_JSON: function () {
            var json = _super_order.export_as_JSON.apply(this, arguments);
            json.negative_stock_user_id = this.negative_stock_user_id
                ? this.negative_stock_user_id.id
                : false;
            return json;
        },
    });

    screens.ProductListWidget.include({
        set_product_list: function (product_list) {
            if (this.pos.config.hide_out_of_stock_products) {
                product_list = _.filter(product_list, function (p) {
                    if (p.type === "product" && p.qty_available <= 0) {
                        return false;
                    }
                    return true;
                });
            }
            this._super(product_list);
        },
    });
});
