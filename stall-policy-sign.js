const policyForm = document.querySelector('#policy-sign-form');
const dateField = document.querySelector('#signed-date');
const signatureField = document.querySelector('#volunteer-signature');
const nameField = document.querySelector('#volunteer-name');
const today = new Date();
today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
dateField.value = today.toISOString().slice(0, 10);
dateField.max = dateField.value;

policyForm.addEventListener('input', () => signatureField.setCustomValidity(''));
policyForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const normaliseName = (name) => name.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!normaliseName(nameField.value) || normaliseName(nameField.value) !== normaliseName(signatureField.value)) {
    signatureField.setCustomValidity('Type the same full name in both name and signature fields.');
    signatureField.reportValidity();
    return;
  }
  window.print();
});
