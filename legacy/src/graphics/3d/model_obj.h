// (C) David Lawrence released under the GPL (see license.txt)
// Started:            ? 2003
// Last modified: 31 Aug 2004

#ifndef MODEL_OBJ
#define MODEL_OBJ

#include <string>
#include <vector>
#include <map>
#include "model.h"
#include "util/textfile_reader.h"

/**
 * Wavefront .obj Model.
 */
class Model_OBJ : public SimpleModel {
    friend class OBJ_Reader;
public:
    Model_OBJ(): SimpleModel() { };
    ~Model_OBJ() { };
    virtual void load(const std::string filename);
    virtual Drawable* clone(void) const {
	throw "FIXME: Model_OBJ.clone() not implemented";
	return 0;
    };
};


class OBJ_Reader;
typedef bool (OBJ_Reader::* lineh)(const std::string& line);
typedef std::map<std::string, lineh> functab_t; // is hash_map portable? 

class OBJ_Reader : public TextFileReader {
public:
    OBJ_Reader(const std::string f, Model_OBJ* obj);
    ~OBJ_Reader() { };
private:
    virtual void handle_line(std::string& line);
    bool line_f(const std::string& line);
    bool line_g(const std::string& line);
    bool line_group(const std::string& line);
    bool line_mtllib(const std::string& line);
    bool line_usemtl(const std::string& line);
    bool line_v(const std::string& line);
    bool line_vt(const std::string& line);
    functab_t functab;
    Model_OBJ* mdl; // the model that we build.
};

// FIXME: Implement this...
#if 0
class MTL_Reader : public TextFileReader {
public:
    MTL_Reader(std::string& f): TextFileReader(f) { };
    ~MTL_Reader() { };
    virtual void handle_line(std::string& line);
private:
    bool read_mtllib(std::string &filename);
    bool mtl_line_newmtl(const std::string& line);
    bool mtl_line_Ns(const std::string& line);
    bool mtl_line_Ka(const std::string& line);
    bool mtl_line_Kd(const std::string& line);
    bool mtl_line_Ke(const std::string& line);
    bool mtl_line_Ks(const std::string& line);
};
#endif

#endif
