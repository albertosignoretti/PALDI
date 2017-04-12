
export type GadgetType = 'input' | 'choice' | 'text';

export abstract class Gadget {
  constructor(public type: GadgetType, public description?: string) {}

  // abstract update method
  update() {}
}