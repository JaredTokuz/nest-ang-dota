export interface ConstantConfig {
  resource: string;
  collectionName: string;
  format: (data: any) => any[];
}

const entriesKeyValue = (data: any) => {
  return Object.entries(data).map((entries) => {
    return {
      key: entries[0],
      value: entries[1],
    };
  });
};

export const configDotaConstants: ConstantConfig[] = [
  {
    resource: 'heroes',
    collectionName: 'heroes',
    format: (data: { [id: string]: any }) => {
      return Object.values(data);
    },
  },
  {
    resource: 'ability_ids',
    collectionName: 'AbilityIds',
    format: (data: { [id: string]: string }) => {
      return entriesKeyValue(data);
    },
  },
  {
    resource: 'hero_abilities',
    collectionName: 'heroAbilities',
    format: (data: { [id: string]: any }) => {
      return entriesKeyValue(data);
    },
  },
  {
    resource: 'item_ids',
    collectionName: 'itemIds',
    format: (data: { [id: string]: string }) => {
      return entriesKeyValue(data);
    },
  },
];
