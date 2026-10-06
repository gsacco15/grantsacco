// The six forms an item can be translated into, in switcher order.
import person from './person.js';
import engineer from './engineer.js';
import maker from './maker.js';
import artist from './artist.js';
import traveller from './traveller.js';
import system from './system.js';

export const FORMS = Object.fromEntries([person, engineer, maker, artist, traveller, system].map((f) => [f.id, f]));
export const ORDER = ['reality', 'structure', 'build', 'image', 'place', 'digital'];
