import {
  Entity, helper,
  LoadStrategy,
  ManyToOne,
  MikroORM,
  PostgreSqlDriver,
  PrimaryKey,
  Property,
  ref,
  Ref
} from '@mikro-orm/postgresql';

import {Type} from '@mikro-orm/core'


export class IDStoredAsInteger extends Type<string, number> {

  convertToDatabaseValue(value: string): number {
    return parseInt(value);
  }

  convertToJSValue(value: number): string {
    return `${value}`;
  }

  getColumnType() {
    return `integer`;
  }

}

@Entity()
class User {


  @PrimaryKey({type: IDStoredAsInteger, autoincrement: true})
  readonly id!: string;

  @Property()
  name: string;

  @Property({ unique: true })
  email: string;

  @ManyToOne(() => Address, {fieldName: 'referenceAnalysisId', index: true, deleteRule: "cascade"})
  address: Ref<Address>;

  @Property({ fieldName: 'updatedAt', onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  constructor(name: string, email: string, address: Ref<Address>) {
    this.name = name;
    this.email = email;
    this.address = address;
  }

}

@Entity()
class Address {


  @PrimaryKey({type: IDStoredAsInteger, autoincrement: true})
  readonly id!: string;

  @Property()
  name: string;

  @Property({ fieldName: 'updatedAt', onUpdate: () => new Date() })
  updatedAt = new Date()

  @ManyToOne(() => AddressType, {fieldName: 'addressTypeId', index: true, deleteRule: 'no action', hidden: true})
  addressType: Ref<AddressType>;

  constructor(name: string, addressType: Ref<AddressType>) {
    this.name = name;
    this.addressType = addressType;
  }

}


@Entity()
class AddressType {


  @PrimaryKey({type: IDStoredAsInteger, autoincrement: true})
  readonly id!: string;

  @Property()
  name: string;

  @Property({ fieldName: 'updatedAt', onUpdate: () => new Date() })
  updatedAt = new Date()

  constructor(name: string) {
    this.name = name;
  }

}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: 'test',
    host: 'localhost',
    port: 5453,
    user: "postgres_user",
    password: "postgres_password",
    entities: [User, Address, AddressType],
    debug: ['query', 'query-params'],
    allowGlobalContext: true, // only for testing,
    driver: PostgreSqlDriver,
    loadStrategy: LoadStrategy.SELECT_IN,
    serialization: {
      forceObject: true
    },
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test('basic CRUD example', async () => {
  const addressType = orm.em.create(AddressType, { name: 'Home' }, {partial: true});
  const address = orm.em.create(Address, { name: '123 Street', addressType: ref(addressType) }, {partial: true});
  orm.em.create(User, { name: 'Foo', email: 'foo', address: ref(address) }, {partial: true});
  await orm.em.flush();
  orm.em.clear();

  const user = await orm.em.findOneOrFail(User, { email: 'foo' });
  const fetchedAddress = await orm.em.findOneOrFail(Address, { name: '123 Street' });
  const fetchedAddressType = await orm.em.findOneOrFail(AddressType, { name: 'Home' });
  console.log("address", helper(fetchedAddress).__originalEntityData)
  console.log("user", helper(user).__originalEntityData)
  console.log("addressType", helper(fetchedAddressType).__originalEntityData)
  user.email = 'bar';
  user.address = ref(Address, fetchedAddress.id)
  // in my example, the address __originalEntityData would serialize the addressType as a string instead of an integer,
  // which would cause the trigger of an update during flush
  await orm.em.flush();

});
