// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu May  5 18:40:44 2005
// Last modified: Thu May  5 18:40:44 2005

#ifndef CITYBLOCK
#define CITYBLOCK

#include "graphics/3d/drawablecontainers.h"
#include "graphics/3d/billboards.h"
#include "util/MersenneTwister.h"
#include <vector>

#define BB_ROOVES 1

/**
 * City Block (containing lamps, trees, buildings etc).
 * @see Skyscraper
 * @see Building
 */
class CityBlock : public DrawableContainer {
public:
    CityBlock(MTRand& mt, float length);
    virtual ~CityBlock() { };
    virtual Drawable* clone() const {
	return new CityBlock(*this);
    };
#if BB_ROOVES
    void add_roof(float w, float h, vector3 pos);
    void representation(drawdetails_t& drawdetails);
    
private:
    GLuint rooftex;
    std::vector<billboard_t> rooves;
#endif
};

#endif // CITYBLOCK
