import {
  Collection,
  Entity,
  ManyToOne,
  MikroORM,
  OneToMany,
  PrimaryKey,
  Property,
  ref,
  Ref,
  sql
} from '@mikro-orm/sqlite';

@Entity()
class House {

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => User, {deleteRule: "cascade"})
  owner: Ref<User>;

  @Property()
  address: string;

  constructor(address: string, owner: Ref<User>) {
   this.address = address;
   this.owner = owner;
  }
}


@Entity()
class User {

  @PrimaryKey()
  id!: number;

  @Property()
  name: string;

  @Property({ unique: true })
  email: string;

  @OneToMany(() => House, house => house.owner)
  houses = new Collection<House>(this);

  constructor(name: string, email: string) {
    this.name = name;
    this.email = email;
  }

}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ':memory:',
    entities: [User, House],
    debug: ['query', 'query-params'],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test('basic CRUD example', async () => {
  const user = orm.em.create(User, { name: 'Foo', email: 'foo' });
  orm.em.create(House, { address: '123 Bar St', owner: user });
  orm.em.create(House, { address: '456 Other St', owner: user });
  await orm.em.flush();
  orm.em.clear();

  const userReference = ref(User, user.id)
  const houses = (await userReference.loadProperty('houses')).getItems();
  expect(houses).toBe(2);
});
