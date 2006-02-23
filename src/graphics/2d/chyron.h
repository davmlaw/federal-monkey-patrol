// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Apr 19 22:15:48 2005
// Last modified: Tue Apr 19 22:15:48 2005

#ifndef CHYRON
#define CHYRON

#include "graphics/2d/drawable2d.h"
#include "graphics/2d/container2d.h"
#include <string>

/**
 * 2d overlay that displays info on the screen (music)
 */
class Chyron : public Drawable2D {
public:
    Chyron(const std::string& song,
	   const std::string& artist,
	   const std::string& album,
	   float w = 0.0f, float h = 0.0f);
    virtual ~Chyron();
    virtual void representation(float alpha);
private:
    Container2D* container;
};

#endif // CHYRON
