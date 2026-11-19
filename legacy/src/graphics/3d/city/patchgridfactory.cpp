// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Nov  6 15:12:26 2005

#include "patchgridfactory.h"
#include "graphics/3d/city/patchgrid.h"

using namespace std;

BoundedDrawable* PatchGridFactory(void)
{
    // City / skyscrapers
    const float BLOCKSIZE = 400.0f;
    const int BLOCKSPERPATCH = 8;
    vector3 dimensions;
    dimensions.x = BLOCKSIZE * BLOCKSPERPATCH * PatchGrid::patches;
    dimensions.y = 10240;
    dimensions.z = dimensions.x;

    return new PatchGrid(dimensions, BLOCKSPERPATCH);

}
