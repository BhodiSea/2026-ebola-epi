begin;
create extension if not exists pgtap;
select plan(1);
select ok(true, 'pgtap available');
select * from finish();
rollback;
