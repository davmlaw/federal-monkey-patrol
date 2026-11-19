// (C) David Lawrence released under the GPL (see license.txt)
// Started:            ? 2003
// Last modified: 14 Apr 2004

#ifndef TEXTURE_H
#define TEXTURE_H

#include "../sdl_opengl.h"
#include <vector>
#include <string>
#include <map>


typedef struct {
    GLuint texId;
    float aspectRatio; // = width / height
} texture_details_t;

typedef std::map<std::string, texture_details_t> TextureHashTable;

/**
 * OpenGL Texture
 */
class Texture {
public:
    Texture(texture_details_t td): textureDetails(td) { };
    Texture(const Texture& rhs): textureDetails(rhs.textureDetails) { };
    ~Texture() { /* FIXME: reference count-- */ };
    void activate(void);
    GLfloat getAspectRatio(void) { return textureDetails.aspectRatio; }
    GLuint getTexId(void) { return textureDetails.texId; };
    // call this when you change a texture in another way (ie display list)
private:
    texture_details_t textureDetails;
    //static GLuint current_texture;
};

Texture *Texture_Factory(const std::string& filename);

#endif
