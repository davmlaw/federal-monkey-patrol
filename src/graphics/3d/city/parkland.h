// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat May  7 11:36:17 2005
// Last modified: Sat May  7 11:36:17 2005

#ifndef PARKLAND
#define PARKLAND

#include "graphics/3d/drawable.h"
#include "graphics/texture.h"
#include "util/MersenneTwister.h"

/**
 * A park, instead of a CityBlock
 */
class Parkland : public Drawable {
public:
    Parkland(MTRand& mt, float x_length, float z_length);
    Parkland(const Parkland& rhs): Drawable(rhs),
				   groundtex(new Texture(*rhs.groundtex)),
				   ground(rhs.ground->clone()),
				   forest(rhs.forest->clone()) { };

    virtual ~Parkland();
    virtual void representation(drawdetails_t& drawdetails);
    virtual Drawable* clone(void) const {
	return new Parkland(*this);
    };
private:
    Texture* groundtex;
    Drawable* ground;
    Drawable* forest;
};

#endif // PARKLAND
