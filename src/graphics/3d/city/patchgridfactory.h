// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Nov  6 15:12:26 2005

#ifndef PATCHGRIDFACTORY_H
#define PATCHGRIDFACTORY_H

#include "graphics/3d/boundeddrawable.h"

/**
 * Returns a patchgrid (though w/o patchgrid type)
 * This was made to reduce recompilation when changing patchgrid internals
 */
BoundedDrawable* PatchGridFactory(void);

#endif // PATCHGRIDFACTORY_H
