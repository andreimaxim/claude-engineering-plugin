# Invoice Autopay

Read this when working through a user flow. The example shows how a few places, affordances, and
connections can expose behavioral questions without committing to screen layouts.

## Start with a concrete entry point

An invoicing product is considering automatic payment of future invoices. A customer is looking
at an unpaid invoice. One candidate puts a "Turn on Autopay" action there:

1. **Invoice:** the customer chooses "Turn on Autopay."
2. **Setup Autopay:** the customer sees the financial institution's identity, enters payment
   details, and submits.
3. **Confirmation:** the customer reads that setup succeeded.

Invoice, Setup Autopay, and Confirmation are places. The action, fields, institution identity, and
confirmation message are affordances. Information counts: reading a message can tell someone what
happened or what they can do next. The transitions between these places are connections.

Whether setup is a separate page or a dialog is still open. At this stage, the question is what
connects to what, not how the interface is drawn.

## Let the flow reveal the missing decision

Playing through that candidate raises a question: did turning on Autopay pay the current invoice,
or only arrange payment of future invoices? The thank-you message cannot settle behavior that the
flow has not defined.

One option adds a "Pay balance now" choice during setup. That introduces another decision and means
confirmation must sometimes show a payment receipt and sometimes only confirm enrollment.

The team tried a different entry point: make Autopay an option within the existing payment flow.

1. **Invoice:** the customer chooses to pay it.
2. **Pay Invoice:** the customer supplies payment details and can opt into Autopay for the future.
3. **Confirmation:** the customer sees the payment receipt and, if chosen, confirmation of Autopay.

Now the immediate payment is unambiguous. The existing payment form supported ACH and credit cards,
so the team confirmed that Autopay could use either. That was a decision in this example, not a
payment-method requirement for other products.

## Follow the interaction far enough to find its boundary

Enrollment is not the whole experience. How would a customer disable Autopay later?

Many customers paid through tokenized invoice links and had no account credentials. Adding a new
account system and self-service management would expand the work considerably. For this project,
the team decided that customers could contact the invoicer to turn off Autopay:

1. **Invoicer's customer list:** open the customer's detail page.
2. **Customer detail:** use a new action to disable Autopay.

The solution reused an existing place instead of requiring a new login and account-management
flow. Whether that compromise is acceptable depends on the product and its customers. The case
does not establish a general rule against self-service.

The resulting elements were small and connected: an Autopay option during payment and a disable
action for the invoicer. Visual design and ordinary implementation choices remained open, while
the current-invoice behavior and management boundary were explicit.

Source: [Find the Elements](https://basecamp.com/shapeup/1.3-chapter-04).
