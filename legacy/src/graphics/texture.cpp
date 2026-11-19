// (C) David Lawrence released under the GPL (see license.txt)
// Started:              2004
// Last modified: 08 May 2004

// FIXME: We should probably keep a reference count in TextureHashTable...
//        though the number of images is small enough to keep all in memory.

#include "graphics/texture.h"
#include "util/util.h"
#include <assert.h>
#include <iostream>
#include <string>
#include <vector>


using namespace std;

static TextureHashTable loaded_textures;
static texture_details_t load_texture(const string& filename);

Texture *Texture_Factory(const string& filename)
{
    TextureHashTable::iterator p = loaded_textures.find(filename);

    if( p != loaded_textures.end() ) { // Texture already loaded.
	return new Texture( p->second );
    }

    texture_details_t td;
    try {
	// Texture was not found, so load it
	td = load_texture(filename);
    } catch (...) {
	cout << "Caught exception loading image.\n";
	td.texId = 0; // so load default texture.
    }

  
    static const string MISSING_TEXTURE = "data/images/missing_texture.jpg";
    
    if( td.texId == 0 ) {
	cout << "Could not load texture \"" << filename << "\"\n";
	if( filename == MISSING_TEXTURE ) {
	    cout << "Can't load fall back image: "
		 << filename << endl;
	    exit(1);
	} else
	    return Texture_Factory(MISSING_TEXTURE);
    }
    loaded_textures[filename] = td;
    return new Texture(td);
    
}


// I originally kept track of active texture as a static member...
// Unfortunately because the city's leaf nodes aren't grouped according to
// texture, there is only ~10% reuse & avoidance of state change so wasn't
// worth the test cost.
// if you do keep track of current texture, then make sure you set current_tex
// to 0 every time you call a display list.
void Texture::activate(void)
{
    glEnable(GL_TEXTURE_2D);
    glBindTexture(GL_TEXTURE_2D, textureDetails.texId);
}


static texture_details_t load_texture(const string& filename)
{
    texture_details_t td;
    td.texId = 0;

    SDL_Surface *TextureImage;
    //cout << "Loading Image: '" << filename.c_str() << "'\n";
    if( ( TextureImage = IMG_Load(filename.c_str()) ) ) {
	GLint bpp = TextureImage->format->BitsPerPixel;
	GLint format = GL_RGB;
	if( bpp == 24 ) {
	    format = GL_RGB;
	} else if( bpp == 32 )
	    format = GL_RGBA; // Alpha.
	else {
	    string msg;
	    cout << "bpp = " << bpp << endl;
	    msg += "\"" + filename + "\" has unsupported BPP of ";
	    msg += bpp;
	    msg += ". Please use 24 or 32 bit.";
	    ERR_QUIT(msg, 1);
	}
	
	glGenTextures( 1, &td.texId );
	glBindTexture( GL_TEXTURE_2D, td.texId );
	td.aspectRatio = (float)TextureImage->w / TextureImage->h;

	// Mipmapping.... 
	glTexParameteri( GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER,
			 GL_LINEAR_MIPMAP_NEAREST );
	glTexParameteri( GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER,
			 GL_LINEAR );
	gluBuild2DMipmaps( GL_TEXTURE_2D, format,
			   TextureImage->w, TextureImage->h,
			   format, GL_UNSIGNED_BYTE,
			   TextureImage->pixels );
	
	SDL_FreeSurface( TextureImage );
    }

    return td;
}

