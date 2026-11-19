// (C) David Lawrence released under the GPL (see license.txt)
// Description:   Loads Quake2 MD2 models 
// Started:              2004
// Last modified: 08 May 2004

// This is taken from Cube - http://wouter.fov120.com/cube/
// changed a bit to fit into and reuse Kong classes.
// FIXME: Add keyframe interpolation, or wait until Cube does and take their
//        newer code.

#include "graphics/3d/model_md2.h" 
#include "util/util.h"
#include <fstream>
#include <iostream>
#include <string>


using namespace std;

struct md2_header
{
    int magic;
    int version;
    int skinWidth, skinHeight;
    int frameSize;
    int numSkins, numVertices, numTexcoords;
    int numTriangles, numGlCommands, numFrames;
    int offsetSkins, offsetTexcoords, offsetTriangles;
    int offsetFrames, offsetGlCommands, offsetEnd;
};

struct md2_vertex
{
    unsigned char vertex[3], lightNormalIndex;
};

struct md2_frame
{
    float      scale[3];
    float      translate[3];
    char       name[16];
    md2_vertex vertices[1];
};


void Model_MD2::load(const string filename)
{

    cout << "Model_MD2::load(\"" + filename + "\")" << endl;

    
    FILE* file;
    md2_header header;
	
    if((file= fopen(filename.c_str(), "rb"))==NULL)
	throw string("Could not open \"" + filename + "\"");
    
    fread(&header, sizeof(md2_header), 1, file);
    endianswap(&header, sizeof(int), sizeof(md2_header)/sizeof(int));
    
    if(header.magic!= 844121161 || header.version!=8)
	throw string("MD2 magic number != 8");
    
    frames = new char[header.frameSize*header.numFrames];
    if(frames==NULL)
	throw string("frames == NULL");
    
    fseek(file, header.offsetFrames, SEEK_SET);
    fread(frames, header.frameSize*header.numFrames, 1, file);
    
    for(int i = 0; i < header.numFrames; ++i)
    {
	endianswap(frames + i * header.frameSize, sizeof(float), 6);
    }
    cout << "Read " << header.numFrames << " frames\n";
    
    glCommands = new long[header.numGlCommands];
    if(glCommands==NULL)
	throw string("Error loading \"" + filename + "\"");
    
    fseek(file,       header.offsetGlCommands, SEEK_SET);
    fread(glCommands, header.numGlCommands*sizeof(long), 1, file);
    
    endianswap(glCommands, sizeof(long), header.numGlCommands);
    
    numFrames    = header.numFrames;
    numGlCommands= header.numGlCommands;
    frameSize    = header.frameSize;
    numTriangles = header.numTriangles;
    numVerts     = header.numVertices;
    
    fclose(file);
	
    mverts = new vec3*[numFrames];
    for(int j=0 ; j<numFrames ; j++)
	mverts[j] = NULL;
	
}

void Model_MD2::scale(int frame, float scale)
{
    mverts[frame] = new vec3[numVerts];
    md2_frame *cf = (md2_frame *) ((char*)frames+frameSize*frame);
    float sc = 16.0f/scale;
    for(int vi=0 ; vi<numVerts ; vi++)
    {
        unsigned char *cv = (unsigned char *)&cf->vertices[vi].vertex;
        vec3 *v = &(mverts[frame])[vi];
        v->x =  ((cv[0]*cf->scale[0]+cf->translate[0]))/sc;
        v->y = -((cv[1]*cf->scale[1]+cf->translate[1]))/sc;
        v->z =  ((cv[2]*cf->scale[2]+cf->translate[2]))/sc;
    };
}


/*
    else if(d->state==CS_EDITING)                   { frame = 162; }
    else if(d->monsterstate==M_ATTACKING)           { frame = 46; range = 8;  if(mdl==19) { frame = 51; range = 19; }; }
    else if(d->monsterstate==M_PAIN)                { frame = 54; range = 4;  if(mdl==19) { frame = 32; range = 18; }; } 
    else if((!d->move && !d->strafe) || !d->moving) { frame = 0;  range = 40; if(mdl==19) { frame = 0;  range = 1;  }; } // idle1
    else                                            { frame = 40; range = 6; speed = 1200/d->maxspeed*scale; if(mdl==19) { frame = 1;  range = 15; speed = 300/d->maxspeed; };  }; // running
*/


void Model_MD2::representation(drawdetails_t& drawdetails)
{
    static int frame = 0;
	
    // HACK - Quake2 MD2's have clockwise vertex ordering....
	// should I reverse them at load time so I don't have to do this?
    glCullFace(GL_FRONT);
    glShadeModel(GL_SMOOTH);
    
    frame++;
    if( frame >= numFrames )
	frame = 0;
    
    int range = 1;
    
    float sc = 20.0;
    float speed = 100.0;
    int basetime = 0;
    int lastmillis = 0;
    
    for( int i=0 ; i<range ; i++ )
	if(!mverts[frame+i])
	    scale(frame+i, sc);
    
    texture->activate();
	
    int time = lastmillis-basetime;
    int fr1 = (int)(time/speed);
    float frac1 = (time-fr1*speed)/speed;
    float frac2 = 1-frac1;
    fr1 = fr1%range+frame;
    int fr2 = fr1+1;
    if(fr2>=frame+range) fr2 = frame;
    vec3 *verts1 = mverts[fr1];
    vec3 *verts2 = mverts[fr2];
    
    for(long *command = glCommands; (*command)!=0;)
    {
	int numVertex = *command++;
	if(numVertex>0) { glBegin(GL_TRIANGLE_STRIP); }
	else            { glBegin(GL_TRIANGLE_FAN); numVertex = -numVertex; };
	
	
	for( int i=0 ; i<numVertex ; i++ ) {
	    float tu = *((float*)command++);
	    float tv = *((float*)command++);
	    glTexCoord2f(tu, tv);
	    int vn = *command++;
	    vec3 &v1 = verts1[vn];
	    vec3 &v2 = verts2[vn];
#define ip(c) v1.c*frac2+v2.c*frac1
	    glVertex3f(ip(x), ip(z), ip(y));
	}
	
	glEnd();
    }
    
    glCullFace(GL_BACK); // MD2's use front face, we don't so switch back.
    glShadeModel(GL_FLAT);
}


