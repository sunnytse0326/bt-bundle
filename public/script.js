$(document).ready(function () {

  // Radio box border
  $('.method').on('click', function () {
    $('.method').removeClass('blue-border');
    $(this).addClass('blue-border');
  });

  // Validation
  var $cardInput = $('.input-fields input');

  $('.next-btn').on('click', function (e) {

    $cardInput.removeClass('warning');

    console.log('hihdsfsdadsfdsafi');

    $cardInput.each(function () {
      var $this = $(this);

      if (!$this.val()) {
        $this.addClass('warning');
      }
    });

  });


  var dropinRadio = $('#hoisted-field-radio');
  var hoistedRadio = $('#dropin-ui-radio');

  var dropinContainer = $('#ui-dropin');
  var hoistedContainer = $('#hoisted-field');

  dropinRadio.change(function () {
    hoistedContainer.show();
    dropinContainer.hide();

    createHoistedField();
  });

  hoistedRadio.change(function () {
    hoistedContainer.hide();
    dropinContainer.show();

    createDropIn();
  });

});

var btInstance;

createHoistedField();

function createHoistedField() {
  braintree.client.create({
    authorization: 'sandbox_7bx4c5qt_fgbw23g9cwm847px'
  }, function (err, clientInstance) {
    if (err) {
      console.error(err);
      return;
    }

    braintree.hostedFields.create({
      client: clientInstance,
      styles: {
        input: {
          // change input styles to match
          // bootstrap styles
          'font-size': '1rem',
          color: '#495057'
        }
      },
      fields: {
        number: {
          selector: '#cc-number',
          placeholder: '4111 1111 1111 1111'
        },
        cvv: {
          selector: '#cc-cvv',
          placeholder: '123'
        },
        expirationDate: {
          selector: '#cc-expiration',
          placeholder: 'MM / YY'
        }
      }
    }, function (err, hostedFieldsInstance) {
      btInstance = hostedFieldsInstance;

      if (err) {
        console.error(err);
        return;
      }
      function createInputChangeEventListener(element) {
        return function () {
          validateInput(element);
        }
      }

      function setValidityClasses(element, validity) {
        if (validity) {
          element.removeClass('is-invalid');
          element.addClass('is-valid');
        } else {
          element.addClass('is-invalid');
          element.removeClass('is-valid');
        }
      }

      var isPaying = false;

      function validateInput(element) {
        // very basic validation, if the
        // fields are empty, mark them
        // as invalid, if not, mark them
        // as valid

        if (!element.val().trim()) {
          setValidityClasses(element, false);

          return false;
        }

        setValidityClasses(element, true);

        return true;
      }

      function validateEmail() {
        var baseValidity = validateInput(email);

        if (!baseValidity) {
          return false;
        }

        if (email.val().indexOf('@') === -1) {
          setValidityClasses(email, false);
          return false;
        }

        setValidityClasses(email, true);
        return true;
      }

      var ccName = $('#cc-name');
      var email = $('#email');

      ccName.on('change', function () {
        validateInput(ccName);
      });
      email.on('change', validateEmail);

      hostedFieldsInstance.on('validityChange', function (event) {
        var field = event.fields[event.emittedBy];

        // Remove any previously applied error or warning classes
        $(field.container).removeClass('is-valid');
        $(field.container).removeClass('is-invalid');

        if (field.isValid) {
          $(field.container).addClass('is-valid');
        } else if (field.isPotentiallyValid) {
          // skip adding classes if the field is
          // not valid, but is potentially valid
        } else {
          $(field.container).addClass('is-invalid');
        }
      });

      hostedFieldsInstance.on('cardTypeChange', function (event) {
        var cardBrand = $('#card-brand');
        var cvvLabel = $('[for="cc-cvv"]');

        if (event.cards.length === 1) {
          var card = event.cards[0];

          // change pay button to specify the type of card
          // being used
          cardBrand.text(card.niceType);
          // update the security code label
          cvvLabel.text(card.code.name);
        } else {
          // reset to defaults
          cardBrand.text('Card');
          cvvLabel.text('CVV');
        }
      });

      $('#pay-now').on('click', function () {
        var formIsInvalid = false;
        var state = hostedFieldsInstance.getState();

        // perform validations on the non-Hosted Fields
        // inputs
        if (!validateEmail() || !validateInput($('#cc-name'))) {
          formIsInvalid = true;
        }

        // Loop through the Hosted Fields and check
        // for validity, apply the is-invalid class
        // to the field container if invalid
        Object.keys(state.fields).forEach(function (field) {
          if (!state.fields[field].isValid) {
            $(state.fields[field].container).addClass('is-invalid');
            formIsInvalid = true;
          }
        });

        if (formIsInvalid || isPaying) {
          // skip tokenization request if any fields are invalid
          return;
        }

        showLoading(true);

        hostedFieldsInstance.tokenize({
          // include the cardholderName in the tokenization
          // request
          cardholderName: $('#cc-name').val()
        }, function (err, payload) {
          if (err) {
            console.error(err);
            showLoading(false);
            return;
          }

          $.ajax({
            type: 'POST',
            url: '/checkout',
            data: { 'paymentMethodNonce': payload.nonce }
          }).done(function (result) {
            // Tear down the Hosted Fields form
            hostedFieldsInstance.teardown(function (teardownErr) {
              if (teardownErr) {
                console.error('Could not tear down the Hosted Fields form!');
                showLoading(false);
              } else {
                console.info('Hosted Fields form has been torn down!');
              }
            });

            if (result.success) {
              $('#bar-checkout-panel').hide();

              $('#payment-success-body').show();
              // $('#checkout-message').html('<h1>Success</h1><p>Your Hosted Fields form is working! Check your <a href="https://sandbox.braintreegateway.com/login">sandbox Control Panel</a> for your test transactions.</p><p>Refresh to try another transaction.</p>');
            } else {
              // $('#checkout-message').html('<h1>Error</h1><p>Check your console.</p>');
            }
          });

        });
      });
    });
  });
}

function createDropIn() {
  braintree.dropin.create({
    authorization: 'sandbox_7bx4c5qt_fgbw23g9cwm847px',
    container: '#ui-dropin'
  }, function (createErr, instance) {
    btInstance = instance;

    $('#pay-now').on('click', function () {
      showLoading(true);
      
      instance.requestPaymentMethod(function (requestPaymentMethodErr, payload) {
        $.ajax({
          type: 'POST',
          url: '/checkout',
          data: { 'paymentMethodNonce': payload.nonce }
        }).done(function (result) {
          instance.teardown(function (teardownErr) {
            if (teardownErr) {
              showLoading(false);
            } else {
            }
          });

          if (result.success) {
            $('#bar-checkout-panel').hide();

            $('#payment-success-body').show();
            // $('#checkout-message').html('<h1>Success</h1><p>Your Hosted Fields form is working! Check your <a href="https://sandbox.braintreegateway.com/login">sandbox Control Panel</a> for your test transactions.</p><p>Refresh to try another transaction.</p>');
          } else {
            // $('#checkout-message').html('<h1>Error</h1><p>Check your console.</p>');
          }
        });
      });
    });
  });
}

function showLoading(load) {
  var loading = $('#loading');
  var paytext = $('#pay-text');

  if (load === true) {
    isPaying = true;
    loading.show();
    paytext.text("Loading...");
  } else {
    isPaying = false;
    loading.hide();
    paytext.text("Pay Now");
  }
}


