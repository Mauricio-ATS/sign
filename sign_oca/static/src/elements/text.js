odoo.define("sign_oca.textElement", function (require) {
    "use strict";
    const core = require("web.core");
    const SignRegistry = require("sign_oca.SignRegistry");
    const textSignOca = {
        change: function (value, parent, item) {
            item.value = value;
            parent.checkFilledAll();
        },
        generate: function (parent, item, signatureItem) {
            var input = $(
                core.qweb.render("sign_oca.sign_iframe_field_text", {
                    item: item,
                    role_id: parent.info.role_id,
                })
            )[0];
            signatureItem[0].addEventListener("focus_signature", () => {
                input.focus();
            });
            input.addEventListener("focus", (ev) => {
                if (
                    item.default_value &&
                    !item.value &&
                    parent.info.partner[item.default_value]
                ) {
                    this.change(
                        parent.info.partner[item.default_value],
                        parent,
                        item,
                        signatureItem
                    );
                    ev.target.value = parent.info.partner[item.default_value];
                }
            });
            input.addEventListener("change", (ev) => {
                this.change(ev.srcElement.value, parent, item, signatureItem);
                if (item.name === "nome") {
                    parent.env.services.rpc({
                        model: "res.partner",
                        method: "search_read",
                        args: [[["name", "ilike", ev.srcElement.value]]],
                        kwargs: {
                            fields: ["name", "rg", "email", "phone", "mobile", "street", "city", "zip", "state_id"],
                            limit: 1,
                        },
                    }).then((partners) => {
                        if (partners.length > 0) {
                            const partner = partners[0];
                            console.log(partner);
                            const fieldMap = {
                                "RG": partner.rg || "",
                                "Phone": partner.phone || partner.mobile,
                                "endereço": partner.street || "",
                                "cidade": partner.city || "",
                                "cep": partner.zip || "",
                            };
                            for (const [id, signItem] of Object.entries(parent.info.items)) {
                                if (fieldMap[signItem.name] !== undefined) {
                                    signItem.value = fieldMap[signItem.name];
                                    // atualiza o input visualmente
                                    const input = parent.items[id];
                                    if (input) {
                                        const inputEl = input.querySelector("input");
                                        if (inputEl) {
                                            inputEl.value = fieldMap[signItem.name];
                                        }
                                    }
                                }
                            }
                            // PEGANDO CODIGO DO STATE
                            parent.env.services.rpc({
                                model: "res.country.state",
                                method: "search_read",
                                args: [[["id", "=", partner.state_id[0]]]],
                                kwargs: { fields: ["code"], limit: 1 },
                            }).then((states) => {
                                if (states.length > 0) {
                                    const ufItem = Object.values(parent.info.items).find(i => i.name === "UF");
                                    if (ufItem) {
                                        ufItem.value = states[0].code;
                                        const inputEl = parent.items[ufItem.id]?.querySelector("input");
                                        if (inputEl) inputEl.value = states[0].code;
                                    }
                                }
                            });
                        }
                    });
                }
            });
            input.addEventListener("keydown", (ev) => {
                if ((ev.keyCode || ev.which) !== 9) {
                    return true;
                }
                ev.preventDefault();
                var next_items = _.filter(
                    parent.info.items,
                    (i) =>
                        i.tabindex > item.tabindex && i.role_id === parent.info.role_id
                ).sort((a, b) => a.tabindex - b.tabindex);
                if (next_items.length > 0) {
                    ev.currentTarget.blur();
                    parent.items[next_items[0].id].dispatchEvent(
                        new Event("focus_signature")
                    );
                }
            });
            return input;
        },
        check: function (item) {
            return Boolean(item.value);
        },
    };
    SignRegistry.add("text", textSignOca);
    return textSignOca;
});
