export interface SingUpData {
  name: string;
  password: string;
  email: string;
  username: string;
}

export interface SingInData {
  username?: string;
  email?: string;
  password: string;
}

export interface PostData {
  content: string;
  parentId?: string;
  images?: File[];
}

export interface Post {
  id: string;
  content: string;
  parentId?: string;
  images?: string[];
  createdAt: Date;
  authorId: string;
  author: Author;
  reactions: ReactionDTO[];
  comments: Post[];
}

export class ReactionDTO {
  constructor (reaction: ReactionDTO) {
    this.id = reaction.id
    this.userId = reaction.userId
    this.postId = reaction.postId
    this.type = reaction.type
    this.createdAt = reaction.createdAt
  }

  id: string
  userId: string
  postId: string
  type: 'like' | 'retweet'
  createdAt: Date
}

export interface PostReaction {
  userId: string;
  postId: string;
  like: boolean;
  retweet: boolean;
}

export interface Author {
  id: string;
  name?: string;
  username: string;
  profilePicture?: string;
  private: boolean;
  createdAt: Date;
}

export interface User {
  id: string;
  name?: string;
  username: string;
  email: string;
  password: string;
  profilePicture?: string;
  isPublic: boolean;
  createdAt: Date;
  followers: Author[];
  following: Author[];
  posts: Post[];
}

export interface MessageDTO {
  id: string;
  content: string;
  createdAt: Date;
  chatId: string;
  senderId: string;
  sender: Author;
}

export interface ChatDTO {
  id: string;
  users: Author[];
  messages: MessageDTO[];
}

export class UserDTO {
  constructor (user: User) {
    this.id = user.id
    this.name = user.name ?? null
    this.createdAt = user.createdAt
    this.isPublic = !user.isPublic
    this.profileImageUrl = user.profilePicture ?? null
  }

  id: string
  name: string | null
  createdAt: Date
  isPublic: boolean
  profileImageUrl: string | null
}

export class ExtendedUserDTO extends UserDTO {
  constructor (user: User) {
    super(user)
    this.email = user.email
    this.name = user.name ?? 'Unknown'
    this.username = user.username
    this.password = user.password
  }

  email!: string
  username!: string
  password!: string
}

export class UserViewDTO {
  constructor (user: User) {
    this.id = user.id
    this.name = user.name ?? 'Unknown'
    this.username = user.username
    this.profilePicture = user.profilePicture ?? null
  }

  id: string
  name: string
  username: string
  profilePicture: string | null
}

export class PostDTO {
  constructor (post: Pick<Post, 'id' | 'authorId' | 'content' | 'images' | 'createdAt'>) {
    this.id = post.id
    this.authorId = post.authorId
    this.content = post.content
    this.images = post.images ?? []
    this.createdAt = post.createdAt
  }

  id: string
  authorId: string
  content: string
  images: string[]
  createdAt: Date
}

export class ExtendedPostDTO extends PostDTO {
  constructor (post: PostDTO, author: ExtendedUserDTO, qtyComments: number, qtyLikes: number, qtyRetweets: number) {
    super(post)
    this.author = author
    this.qtyComments = qtyComments
    this.qtyLikes = qtyLikes
    this.qtyRetweets = qtyRetweets
  }

  author!: ExtendedUserDTO
  qtyComments!: number
  qtyLikes!: number
  qtyRetweets!: number
}