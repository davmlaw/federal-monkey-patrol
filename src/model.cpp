#include <stdio.h>
#include <string.h>

#include "kong.h"
#include "model.h"
#include "model_obj.h"

Model *Model_Factory(string filename)
{
    Model *mdl = NULL;

    if( filename.find(".obj") != string::npos )
	mdl = new Model_OBJ();
    // Add in support for new model formats here.... eg:
    // else if( filename.find(".3ds") != string::npos )
    //    mdl = new Model_3DS();
    else
	throw string("Unrecognised Model Type: ") + filename;

    mdl->load(filename);
    mdl->generate_smooth_normals();
    mdl->process(); // optimise for rendering.

    return mdl;

}

Model *Model_Factory(string filename, string texturename)
{

    Model *mdl = NULL;

    if( filename.find(".obj") != string::npos )
	mdl = new Model_OBJ();
    // Add in support for new model formats here.... eg:
    // else if( filename.find(".3ds") != string::npos )
    //    mdl = new Model_3DS();
    else
	throw string("Unrecognised Model Type: ") + filename;

    mdl->load(filename);
    mdl->generate_smooth_normals();
    mdl->setTexture(texturename.c_str());
    mdl->process(); // optimise for rendering.

    return mdl;

}
