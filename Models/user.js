class User {
    // *Create a User(from data), update db, and return new user data.
    // data should be{ firstname, lastname, email, birthdate, phone, birthday, location,
    // avatar, location, wallpaper, and createdAt} 
    // Returns { firstname, lastname, email, birthdate, phone, birthday, location,
    // avatar, location, wallpaper, and createdAt} 
    // Throws badRequestError if user is already in the database.
    

static async create({firstname, lastname, email, birthdate, phone, birthday, location, avatar, location, wallpaper, createdAt}) {
    const duplicateCheck = await db.query(
        `SELECT firstname, lastname
         FROM User
         WHERE handle = $1, 2`
      [firstname, lastname]);

  if (duplicateCheck.rows[0])
    throw new BadRequestError(`User ${firstname, lastname}, already exists`);

  
  const result = await db.query(
        `INSERT INTO Users
         (firstname, lastname, email, birthdate, phone, birthday, location, avatar, location, wallpaper, createdAt)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING firstname, lastname, email, birthdate, phone, birthday, location,avatar, location, wallpaper, createdAt`,
      [
        firstname, 
        lastname,
        email, 
        birthdate, 
        phone, 
        birthday, 
        location,
        avatar, 
        location, 
        wallpaper, 
        createdAt
      ],
  );
  const User = result.rows[0];

  return User;
}



}
