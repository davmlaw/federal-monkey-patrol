// (C) David Lawrence released under the GPL (see license.txt)
// Started:       10 Feb 2004
// Last modified: 14 Apr 2004

#ifndef MODEL_MD2
#define MODEL_MD2

#include <string>
#include "kong.h"
#include "model.h"

typedef struct { float x, y, z; } vec3;

/**
 * Quake 2 MD2 model.
 * Code originally from Cube - http://wouter.fov120.com/cube/
 */
class Model_MD2 : public Model {
public:
	Model_MD2(): Model(), numGlCommands(0), frameSize(0), numFrames(0) {};
	~Model_MD2() {
		if(glCommands)
			delete [] glCommands;
		if(frames)
			delete [] frames;
	};

    void load(const std::string filename);
    virtual Drawable* clone(void) const {
	throw "FIXME: Model_MD2.clone() not implemented";
	return 0;
    }
protected:
    virtual void representation(drawdetails_t& drawdetails);
private:
    void scale(int frame, float scale);
    int numGlCommands;
    long* glCommands;
    int numTriangles;
    int frameSize;
    int numFrames;
    int numVerts;
    char* frames;
    vec3 **mverts;
};


#endif
