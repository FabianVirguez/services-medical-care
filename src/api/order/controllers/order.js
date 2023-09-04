"use strict";

const { configMercadoPago } = require("../../../config/environments");
const mercadopago = require("mercadopago");
mercadopago.configurations.setAccessToken(configMercadoPago.access_token);

function calcDiscountProduct(price, discount) {
  if (!discount) return price;

  const discountValue = (price * discount) / 100;
  const result = price - discountValue;
  return result.toFixed(2);
}

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async paymentOrder(ctx) {
    const { token, products, idUser, addressShipping, email } =
      ctx.request.body;
    let totalPayment = 0;
    products.forEach((product) => {
      const priceTem = calcDiscountProduct(
        product.atributes.price,
        product.atributes.discount
      );
      totalPayment += Number(priceTem) * product.quantity;
    });

    const payment_data = {
      description: "Payment order test",
      installments: 1,
      issuer_id: idUser,
      payer: {
        entity_type: "individual",
        type: "customer",
        email: email,
      },
      payment_method_id: "visa",
      token: token?.id,
      transaction_amount: Math.round(totalPayment),
    };

    // @ts-ignore
    const payment = await mercadopago.payment.create(payment_data);
    const data = {
      products,
      user: idUser,
      totalPayment,
      idPayment: payment?.response.id,
      addressShipping,
    };
    const model = strapi.contentTypes["api::order.order"];
    const validData = await strapi.entityValidator.validateEntityCreation(
      model,
      data
    );
    const entry = await strapi.db
      .query("api::order.order")
      .create({ data: validData });
    return entry;
  },
}));
