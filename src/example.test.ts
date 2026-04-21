import 'reflect-metadata';
import { Entity, Enum, ManyToOne, PrimaryKey, Property, ReflectMetadataProvider } from '@mikro-orm/decorators/legacy';
import { MikroORM, type Ref } from '@mikro-orm/sqlite';

// Crash on MikroORM v7 metadata discovery when two STI hierarchies are linked
// by a `@ManyToOne` whose target is narrowed on each subclass.
//
// Pet is an STI base with a @ManyToOne to Food (also STI). Dog narrows
// favoriteFood to DogFood; Cat narrows it to CatFood. Same SQL column,
// different TypeScript target per subclass.
//
// MikroORM.init crashes with:
//   TypeError: Cannot read properties of undefined (reading 'primaryKeys')
//     at MetadataDiscovery.initManyToOneFieldName
//     at MetadataDiscovery.initFieldName
//     at MetadataDiscovery.initSingleTableInheritance

enum Species {
  DOG = 'DOG',
  CAT = 'CAT',
}

@Entity({ tableName: 'food', abstract: true, discriminatorColumn: 'species' })
abstract class Food {

  @PrimaryKey()
  id!: number;

  @Enum(() => Species)
  species!: Species;

}

@Entity({ discriminatorValue: Species.DOG })
class DogFood extends Food {}

@Entity({ discriminatorValue: Species.CAT })
class CatFood extends Food {}

@Entity({ tableName: 'pet', abstract: true, discriminatorColumn: 'species' })
abstract class Pet {

  @PrimaryKey()
  id!: number;

  @Enum(() => Species)
  species!: Species;

  @ManyToOne(() => Food)
  favoriteFood!: Ref<Food>;

}

@Entity({ discriminatorValue: Species.DOG })
class Dog extends Pet {

  @ManyToOne(() => DogFood)
  declare favoriteFood: Ref<DogFood>;

}

@Entity({ discriminatorValue: Species.CAT })
class Cat extends Pet {

  @ManyToOne(() => CatFood)
  declare favoriteFood: Ref<CatFood>;

}

test('STI subclass @ManyToOne override does not crash metadata discovery', async () => {
  const orm = await MikroORM.init({
    dbName: ':memory:',
    entities: [Food, DogFood, CatFood, Pet, Dog, Cat],
    metadataProvider: ReflectMetadataProvider,
    allowGlobalContext: true, // only for testing
  });
  expect(orm.getMetadata().has('Dog')).toBe(true);
  expect(orm.getMetadata().has('Cat')).toBe(true);
  await orm.close(true);
});
