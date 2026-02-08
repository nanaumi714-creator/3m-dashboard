-- Allow prepaid card accounts as a first-class asset type.

alter table accounts drop constraint if exists chk_accounts_asset_type;
alter table accounts add constraint chk_accounts_asset_type
  check (asset_type in ('cash', 'qr', 'bank', 'emoney', 'credit_payable', 'prepaid_card'));
