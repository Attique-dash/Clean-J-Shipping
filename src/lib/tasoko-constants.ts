// File: src/lib/tasoko-constants.ts
export const SERVICE_TYPE_MAP = {
  '59cadcd4-7508-450b-85aa-9ec908d168fe': 'AIR STANDARD',
  '25a1d8e5-a478-4cc3-b1fd-a37d0d787302': 'AIR EXPRESS',
  '8df142ca-0573-4ce9-b11d-7a3e5f8ba196': 'AIR PREMIUM',
  '7c9638e8-4bb3-499e-8af9-d09f757a099e': 'SEA STANDARD',
  '': 'UNSPECIFIED',
};

export const MANIFEST_STATUS_MAP = {
  '0': 'AT WAREHOUSE',
  '1': 'DELIVERED TO AIRPORT',
  '2': 'IN TRANSIT TO LOCAL PORT',
  '3': 'AT LOCAL PORT',
  '4': 'AT LOCAL SORTING',
};

export const PACKAGE_STATUS_MAP = {
  '0': 'AT WAREHOUSE',
  '1': 'DELIVERED TO AIRPORT',
  '2': 'IN TRANSIT TO LOCAL PORT',
  '3': 'AT LOCAL PORT',
  '4': 'AT LOCAL SORTING',
};

export const HAZMAT_CODES = {
  '0acc224d-2eeb-44c1-b472-8c671893b4e9': 'Oxidizer',
  '1cad6a51-29f9-4065-ad07-dc22b44aefb6': 'Explosive 1.6 N',
  '2291c23f-48f6-413b-81a9-f819cc0c9ec9': 'Flammable Liquid',
  '345eb0e3-d6f7-4e0c-bf89-79b16e0fe35f': 'Infectious substance',
  // ... more hazmat codes
};
